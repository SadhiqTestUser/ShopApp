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
async function getRazorpayPaymentMethod(paymentId, keyId, keySecret) {
    try {
        const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
        });
        if (!response.ok)
            return null;
        const payment = await response.json();
        return typeof payment.method === 'string' && payment.method ? payment.method : null;
    }
    catch {
        return null;
    }
}
export const verifyRazorpayPayment = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const uid = request.auth.uid;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = request.data;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new HttpsError('invalid-argument', 'Missing payment verification fields');
    }
    const keySecret = RAZORPAY_KEY_SECRET.value();
    const keyId = RAZORPAY_KEY_ID.value();
    if (!keyId || !keySecret) {
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
    const paymentMethod = await getRazorpayPaymentMethod(razorpay_payment_id, keyId, keySecret);
    await orderRef.update({
        razorpay_payment_id,
        razorpay_signature,
        payment_gateway: 'razorpay',
        payment_method: paymentMethod ?? 'razorpay',
        payment_status: 'paid',
        status: 'processing',
    });
    return { success: true, order_id };
});
async function downloadFile(url) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
}
// Minimal ZIP writer: stores files uncompressed (STORE method, method 0).
// This avoids needing a zip compression library while still producing a
// valid .zip that all OS file managers can open.
function buildZip(files) {
    const encoder = new TextEncoder();
    const fileRecords = [];
    const centralDirRecords = [];
    let offset = 0;
    const crc32Table = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++)
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            table[i] = c >>> 0;
        }
        return table;
    })();
    function crc32(data) {
        let crc = 0xffffffff;
        for (let i = 0; i < data.length; i++)
            crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }
    const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
    const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
    for (const file of files) {
        const nameBytes = encoder.encode(file.filename);
        const crc = crc32(file.data);
        const size = file.data.length;
        const localHeader = [
            ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0),
        ];
        const localRecord = new Uint8Array(localHeader.length + nameBytes.length + size);
        localRecord.set(new Uint8Array(localHeader), 0);
        localRecord.set(nameBytes, localHeader.length);
        localRecord.set(file.data, localHeader.length + nameBytes.length);
        fileRecords.push(localRecord);
        const centralHeader = [
            ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
        ];
        const centralRecord = new Uint8Array(centralHeader.length + nameBytes.length);
        centralRecord.set(new Uint8Array(centralHeader), 0);
        centralRecord.set(nameBytes, centralHeader.length);
        centralDirRecords.push(centralRecord);
        offset += localRecord.length;
    }
    const centralDirSize = centralDirRecords.reduce((s, r) => s + r.length, 0);
    const eocd = new Uint8Array([
        ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
        ...u32(centralDirSize), ...u32(offset), ...u16(0),
    ]);
    const totalLen = fileRecords.reduce((s, r) => s + r.length, 0) + centralDirSize + eocd.length;
    const zip = new Uint8Array(totalLen);
    let pos = 0;
    for (const r of fileRecords) {
        zip.set(r, pos);
        pos += r.length;
    }
    for (const r of centralDirRecords) {
        zip.set(r, pos);
        pos += r.length;
    }
    zip.set(eocd, pos);
    return zip;
}
export const downloadOrderImages = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { images } = request.data;
    if (!Array.isArray(images) || images.length === 0) {
        throw new HttpsError('invalid-argument', 'No images provided');
    }
    const files = [];
    for (const { url, filename } of images) {
        try {
            files.push({ filename, data: await downloadFile(url) });
        }
        catch (err) {
            console.error(`Failed to download ${filename}:`, err);
        }
    }
    if (files.length === 0) {
        throw new HttpsError('unavailable', 'Could not download any images');
    }
    const zip = buildZip(files);
    const zipName = (images[0]?.filename ?? 'order').split('_')[0] || 'order';
    return {
        filename: `${zipName}_images.zip`,
        zipBase64: Buffer.from(zip).toString('base64'),
    };
});
//# sourceMappingURL=index.js.map