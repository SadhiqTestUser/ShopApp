import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHmac } from 'node:crypto';
initializeApp();
const db = getFirestore();
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
export const createRazorpayOrder = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const uid = request.auth.uid;
    const data = request.data;
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Invalid amount');
    }
    // Razorpay requires a minimum charge of 100 paise (₹1).
    if (Math.round(amount * 100) < 100) {
        throw new HttpsError('invalid-argument', 'Amount must be at least ₹1 (100 paise).');
    }
    // Validate credentials up front so a misconfigured deploy fails clearly
    // and never leaves behind an orphaned "pending" order.
    const keyId = RAZORPAY_KEY_ID.value();
    const keySecret = RAZORPAY_KEY_SECRET.value();
    if (!keyId || !keySecret) {
        throw new HttpsError('failed-precondition', 'Razorpay keys are not configured. Set the RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET secrets and redeploy the functions.');
    }
    const items = Array.isArray(data.items) ? data.items : [];
    // Reserve a document id without writing yet, so a Razorpay failure does
    // not persist an unusable order.
    const orderRef = db.collection('orders').doc();
    let razorpayOrder;
    try {
        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100),
                currency: 'INR',
                receipt: orderRef.id,
                notes: { order_id: orderRef.id, user_id: uid },
            }),
        });
        if (!razorpayResponse.ok) {
            const body = await razorpayResponse.text();
            console.error('Razorpay order creation failed:', razorpayResponse.status, body);
            let description = `Razorpay returned HTTP ${razorpayResponse.status}`;
            try {
                const parsed = JSON.parse(body);
                if (parsed.error?.description)
                    description = parsed.error.description;
            }
            catch {
                // Non-JSON body; keep the generic status message.
            }
            throw new HttpsError('internal', `Failed to create Razorpay order: ${description}`);
        }
        razorpayOrder = (await razorpayResponse.json());
    }
    catch (err) {
        if (err instanceof HttpsError)
            throw err;
        console.error('Unexpected error calling Razorpay:', err);
        throw new HttpsError('internal', 'Could not reach the payment gateway. Please try again.');
    }
    await orderRef.set({
        user_id: uid,
        total: amount,
        shipping_name: data.shipping_name ?? '',
        shipping_phone: data.shipping_phone ?? '',
        shipping_address: data.shipping_address ?? '',
        shipping_pincode: data.shipping_pincode ?? '',
        shipping_city: data.shipping_city ?? '',
        shipping_state: data.shipping_state ?? '',
        order_items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            customization_data: item.customization_data ?? null,
        })),
        razorpay_order_id: razorpayOrder.id,
        payment_status: 'pending',
        status: 'pending',
        created_at: new Date().toISOString(),
        created_at_ts: FieldValue.serverTimestamp(),
    });
    return {
        order_id: orderRef.id,
        razorpay_order_id: razorpayOrder.id,
        razorpay_key_id: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
    };
});
export const verifyRazorpayPayment = onCall({ secrets: [RAZORPAY_KEY_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const uid = request.auth.uid;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = request.data;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new HttpsError('invalid-argument', 'Missing payment verification fields');
    }
    const keySecret = RAZORPAY_KEY_SECRET.value();
    if (!keySecret) {
        throw new HttpsError('failed-precondition', 'Razorpay keys not configured');
    }
    const orderRef = db.collection('orders').doc(order_id);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists || orderSnap.get('user_id') !== uid) {
        throw new HttpsError('permission-denied', 'Order not found');
    }
    const expectedSignature = createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
    if (expectedSignature !== razorpay_signature) {
        await orderRef.update({ payment_status: 'failed' });
        throw new HttpsError('invalid-argument', 'Payment verification failed');
    }
    await orderRef.update({
        razorpay_payment_id,
        razorpay_signature,
        payment_status: 'paid',
        status: 'processing',
    });
    return { success: true, order_id };
});
//# sourceMappingURL=index.js.map