const firebaseSdk = 'https://www.gstatic.com/firebasejs/11.10.0/';
let firebaseCloud;

function cloudReady() {
  const config = cloudConfig.firebase;
  return Boolean(config?.apiKey && config.authDomain && config.projectId && config.appId);
}

async function connectFirebase() {
  const [app, auth, store] = await Promise.all([
    import(firebaseSdk + 'firebase-app.js'),
    import(firebaseSdk + 'firebase-auth.js'),
    import(firebaseSdk + 'firebase-firestore.js')
  ]);
  const instance = app.initializeApp(cloudConfig.firebase);
  firebaseCloud = { auth, store, account: auth.getAuth(instance), db: store.getFirestore(instance) };
  return firebaseCloud;
}

async function syncRecords(records) {
  const uid = state.session?.user.id;
  if (!uid || !records.length) return;
  const { store, db, account } = firebaseCloud;
  for (const record of records) {
    if (account.currentUser?.uid !== uid) return;
    const ref = store.doc(db, 'archives', uid, 'fragments', encodeURIComponent(record.id));
    const { image, imagePath, ...metadata } = record;
    const deleted = record.bucket === 'deleted';
    const [imageHeader, encoded] = !deleted && image?.startsWith('data:') ? image.split(',') : [];
    const binary = encoded ? atob(encoded) : '';
    const chunks = [];
    for (let offset = 0; offset < binary.length; offset += 700000) {
      chunks.push(store.Bytes.fromUint8Array(Uint8Array.from(binary.slice(offset, offset + 700000), c => c.charCodeAt(0))));
    }
    await store.runTransaction(db, async transaction => {
      const current = (await transaction.get(ref)).data();
      if (account.currentUser?.uid !== uid || current?.updatedAt >= record.updatedAt) return;
      const previousCount = current?.chunkCount || 0;
      const preserveImage = !deleted && !chunks.length && previousCount > 0;
      const chunkCount = preserveImage ? previousCount : chunks.length;
      const data = deleted ? { id: record.id, bucket: 'deleted', updatedAt: record.updatedAt } : metadata;
      transaction.set(ref, { ...data, chunkCount, imageHeader: preserveImage ? current.imageHeader : imageHeader || '' });
      chunks.forEach((bytes, index) => transaction.set(store.doc(ref, 'image', String(index)), { bytes }));
      for (let index = chunkCount; index < previousCount; index++) {
        transaction.delete(store.doc(ref, 'image', String(index)));
      }
    });
  }
}

async function readCloudRecords(uid) {
  const { store, db } = firebaseCloud;
  const snapshot = await store.getDocsFromServer(store.collection(db, 'archives', uid, 'fragments'));
  return snapshot.docs.map(doc => ({ ref: doc.ref, ...doc.data() }));
}

async function readCloudImage({ ref, chunkCount, imageHeader }) {
  if (!chunkCount) return '';
  const { store } = firebaseCloud;
  const parts = await Promise.all(Array.from({ length: chunkCount }, async (_, index) => {
    const chunk = await store.getDocFromServer(store.doc(ref, 'image', String(index)));
    return chunk.data().bytes.toUint8Array();
  }));
  const mime = imageHeader.match(/^data:(image\/(?:jpeg|png|webp));base64$/)?.[1];
  if (!mime) throw new Error('Unsupported screenshot format.');
  return fileToDataUrl(new Blob(parts, { type: mime }));
}
