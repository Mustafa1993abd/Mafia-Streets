import express from 'express';
// RULE: All API responses must be JSON. Do not return HTML for API routes.
import admin from 'firebase-admin';
const FieldValue = admin.firestore.FieldValue;
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize Firebase Admin
let db: any = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT not configured, Firebase Admin not initialized.');
  }
} catch (e) {
  console.error('Error initializing Firebase Admin:', e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.get('/api/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ status: 'ok' });
  });

  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
      res.json({ base64 });
    } catch (error: any) {
      console.error('Proxy image error:', error);
      res.status(500).json({ error: error.message || 'Failed to proxy image' });
    }
  });

  app.get('/api/admin/dist-status', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const govDoc = await db.collection('government').doc('current').get();
      const govData = govDoc.data() || {};
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const todayBaghdad = baghdadNow.toISOString().split('T')[0];
      const baghdadTime = baghdadNow.toISOString().split('T')[1].split('.')[0]; // HH:mm:ss
      
      res.json({ 
        lastDistribution: govData.lastDistributionDate,
        forceDistribution: govData.forceDistribution,
        baghdadTime,
        shouldRun: govData.lastDistributionDate !== todayBaghdad || govData.forceDistribution === true
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/search', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) {
        return res.json({ users: [] });
      }

      console.log(`Searching for users with query: "${q}"`);
      const usersRef = db.collection('users_public');
      
      // Firestore prefix search is case-sensitive. 
      // We try multiple variations to be more forgiving.
      const queryStrings = new Set<string>();
      queryStrings.add(q);
      queryStrings.add(q.toLowerCase());
      queryStrings.add(q.toUpperCase());
      queryStrings.add(q.charAt(0).toUpperCase() + q.slice(1).toLowerCase());

      const snapshots = await Promise.all(
        Array.from(queryStrings).flatMap(qs => [
          usersRef
            .where('displayName', '>=', qs)
            .where('displayName', '<=', qs + '\uf8ff')
            .limit(10)
            .get(),
          usersRef
            .where('phoneNumber', '>=', qs)
            .where('phoneNumber', '<=', qs + '\uf8ff')
            .limit(10)
            .get()
        ])
      );

      const resultsMap = new Map();
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          resultsMap.set(doc.id, {
            id: doc.id,
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null,
            phoneNumber: data.phoneNumber || null
          });
        });
      });

      // If no results by name or phone, try searching by ID
      if (resultsMap.size === 0 && q.length >= 20) {
        const docById = await usersRef.doc(q).get();
        if (docById.exists) {
          const data = docById.data()!;
          resultsMap.set(docById.id, {
            id: docById.id,
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null,
            phoneNumber: data.phoneNumber || null
          });
        }
      }

      const results = Array.from(resultsMap.values()).slice(0, 10);
      console.log(`Found ${results.length} users for query "${q}"`);
      res.json({ users: results });
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/random', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.limit(50).get();

      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          displayName: data.displayName || 'Unknown',
          level: data.level || 1,
          reputation: data.reputation || 0,
          gangId: data.gangId || null,
          gangRole: data.gangRole || null,
          photoURL: data.photoURL || null
        };
      });

      res.json({ users: results });
    } catch (error) {
      console.error('Random users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/market/gift', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { senderId, recipientId, item, price, updatePath } = req.body;

    try {
      const senderRef = db.collection('users').doc(senderId);
      const recipientRef = db.collection('users').doc(recipientId);

      await db.runTransaction(async (transaction) => {
        if (senderId === recipientId) {
          throw new Error('You cannot gift to yourself');
        }
        const senderDoc = await transaction.get(senderRef);
        const senderData = senderDoc.data();

        if (!senderData || (senderData.cleanMoney || 0) < price) {
          throw new Error('Insufficient funds');
        }

        // Deduct from sender
        transaction.update(senderRef, {
          cleanMoney: admin.firestore.FieldValue.increment(-price)
        });

        // Add to recipient
        transaction.update(recipientRef, {
          [updatePath]: admin.firestore.FieldValue.increment(1)
        });

        // Send notification message
        const msgRef = db.collection('messages').doc();
        const iraqiMessages = [
          `جبتلك هاي الهدية (${item.name})، تستاهل يا بطل!`,
          `هاك هاي مني الك (${item.name})، بالعافية عليك يا غالي.`,
          `دزيتلك خوش شغلة (${item.name})، ان شاء الله تفيدك بمغامراتك.`,
          `تفضل هاي الهدية المتواضعة (${item.name})، تستاهل كل خير والله.`
        ];
        const randomMessage = iraqiMessages[Math.floor(Math.random() * iraqiMessages.length)];

        transaction.set(msgRef, {
          senderId: 'system',
          senderName: 'نظام الهدايا',
          receiverId: recipientId,
          content: randomMessage,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          type: 'system'
        });

        // Add to gift_notifications for real-time UI
        const giftNotifRef = db.collection('gift_notifications').doc();
        transaction.set(giftNotifRef, {
          recipientId,
          senderName: senderData.displayName,
          itemName: item.name,
          itemImage: item.image,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Gifting error:', error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/government/action', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    
    const { action, targetUserId, pmId } = req.body;

    try {
      const govDoc = await db.collection('government').doc('current').get();
      const govData = govDoc.data();

      if (govData?.primeMinisterId !== pmId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const userRef = db.collection('users').doc(targetUserId);
      
      if (action === 'issueDocs') {
        await userRef.update({
          'documents.passport': true,
          'documents.clearance': true,
          'documents.license': true,
          'documents.weapon': true
        });
      } else if (action === 'cancelWarrants') {
        await userRef.update({ warrants: false });
      } else if (action === 'releasePrisoners') {
        await userRef.update({ jailTimeEnd: null });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/issue-doc', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { docId, userId } = req.body;
    const prices: any = { clearance: 50000, passport: 150000, license: 25000, weapon: 500000 };
    const price = prices[docId];

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < price) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      await userRef.update({
        cleanMoney: FieldValue.increment(-price),
        [`documents.${docId}`]: true
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/buy-votes', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { votes, gangId, userId } = req.body;
    const votePrice = 50000;
    const totalCost = votes * votePrice;

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < totalCost) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};
        const currentVotes = govData.gangVotes || {};
        const newVotes = (currentVotes[gangId] || 0) + votes;

        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-totalCost)
        });

        transaction.update(govRef, {
          [`gangVotes.${gangId}`]: newVotes
        });
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/nominate', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { userId, displayName, gangId } = req.body;
    const nominationFee = 1000000;

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < nominationFee) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};

        if (!govData.electionActive) {
          throw new Error('Election is not active');
        }

        const candidates = govData.candidates || [];
        if (candidates.some((c: any) => c.uid === userId)) {
          throw new Error('Already a candidate');
        }

        const newCandidate = {
          uid: userId,
          displayName: displayName,
          gangId: gangId,
          votes: 0
        };

        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-nominationFee)
        });

        transaction.update(govRef, {
          candidates: FieldValue.arrayUnion(newCandidate)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/government/bribe-committee', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { committeeId, userId } = req.body;
    const bribePrice = 10000000; // 10 Million for a committee bribe

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < bribePrice) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};
        
        // Update committee influence or status
        const committees = govData.committees || {};
        const currentInfluence = committees[committeeId]?.influence || 0;
        
        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-bribePrice)
        });

        transaction.update(govRef, {
          [`committees.${committeeId}.influence`]: FieldValue.increment(10),
          [`committees.${committeeId}.lastBribeBy`]: userId,
          [`committees.${committeeId}.lastBribeAt`]: new Date().toISOString()
        });
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Gang Routes
  app.post('/api/gangs/create', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { name, userId, displayName } = req.body;
    const creationFee = 100000; // 100k for testing

    if (typeof name !== 'string' || name.trim().length === 0) {
      console.error('Invalid gang name:', name);
      return res.status(400).json({ error: 'Invalid gang name' });
    }

    try {
      console.log('Creating gang:', { name, userId, displayName });
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.error('User document not found:', userId);
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      console.log('User data:', userData);

      if (!userData || (userData.cleanMoney || 0) < creationFee) {
        console.error('Insufficient funds:', userData?.cleanMoney);
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      if (userData.gangId) {
        console.error('User already in a gang:', userData.gangId);
        return res.status(400).json({ error: 'Already in a gang' });
      }

      const gangId = `gang_${Date.now()}`;
      const gangRef = db.collection('gangs').doc(gangId);

      console.log('Starting transaction for gang creation...');
      try {
        await db.runTransaction(async (transaction) => {
          console.log('Transaction started...');
          transaction.update(userRef, {
            cleanMoney: FieldValue.increment(-creationFee),
            gangId: gangId,
            gangRole: 'leader'
          });

          const gangData = {
            id: gangId,
            name: name,
            leaderId: userId,
            leaderName: displayName,
            balance: 0,
            level: 1,
            reputation: 0,
            members: [userId],
            pendingRequests: [],
            inventory: [],
            description: '',
            logo: '',
            createdAt: FieldValue.serverTimestamp()
          };
          console.log('Gang data to set:', gangData);
          transaction.set(gangRef, gangData);
          console.log('Transaction operations queued...');
        });
        console.log('Transaction committed successfully.');
      } catch (transactionError: any) {
        console.error('Transaction failed:', transactionError);
        throw transactionError;
      }
      console.log('Gang created successfully:', gangId);

      res.json({ success: true, gangId });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/join-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, displayName } = req.body;
    const joinFee = 100000; // 100k

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (!userData || (userData.cleanMoney || 0) < joinFee) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      if (userData.gangId) {
        return res.status(400).json({ error: 'Already in a gang' });
      }

      const gangRef = db.collection('gangs').doc(gangId);
      const gangDoc = await gangRef.get();
      const gangData = gangDoc.data();

      if (!gangData) {
        return res.status(404).json({ error: 'Gang not found' });
      }

      if (gangData.pendingRequests?.some((r: any) => r.uid === userId)) {
        return res.status(400).json({ error: 'Request already pending' });
      }

      await db.runTransaction(async (transaction) => {
        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-joinFee)
        });

        transaction.update(gangRef, {
          balance: FieldValue.increment(joinFee),
          pendingRequests: FieldValue.arrayUnion({
            uid: userId,
            displayName: displayName,
            timestamp: new Date().toISOString()
          })
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/approve-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, applicantId, leaderId } = req.body;

    try {
      const gangRef = db.collection('gangs').doc(gangId);
      const applicantRef = db.collection('users').doc(applicantId);

      await db.runTransaction(async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!gangData || gangData.leaderId !== leaderId) {
          throw new Error('Unauthorized');
        }

        const request = gangData.pendingRequests?.find((r: any) => r.uid === applicantId);
        if (!request) {
          throw new Error('Request not found');
        }

        transaction.update(gangRef, {
          members: FieldValue.arrayUnion(applicantId),
          pendingRequests: FieldValue.arrayRemove(request)
        });

        transaction.update(applicantRef, {
          gangId: gangId,
          gangRole: 'member'
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/reject-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, applicantId, leaderId } = req.body;

    try {
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!gangData || gangData.leaderId !== leaderId) {
          throw new Error('Unauthorized');
        }

        const request = gangData.pendingRequests?.find((r: any) => r.uid === applicantId);
        if (!request) {
          throw new Error('Request not found');
        }

        transaction.update(gangRef, {
          pendingRequests: FieldValue.arrayRemove(request)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/deposit-item', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, itemType, itemId, amount } = req.body;

    try {
      const userRef = db.collection('users').doc(userId);
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!userData || !gangData || userData.gangId !== gangId) {
          throw new Error('Unauthorized');
        }

        const userInventory = userData.inventory || {};
        const category = userInventory[itemType] || {};
        const currentAmount = category[itemId] || 0;

        if (currentAmount < amount) {
          throw new Error('Insufficient items');
        }

        // Update user inventory
        transaction.update(userRef, {
          [`inventory.${itemType}.${itemId}`]: FieldValue.increment(-amount)
        });

        // Update gang inventory
        const gangInventory = gangData.inventory || {};
        const newGangAmount = (gangInventory[itemId] || 0) + amount;
        transaction.update(gangRef, {
          [`inventory.${itemId}`]: newGangAmount
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/withdraw-item', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, itemId, amount } = req.body;

    try {
      const userRef = db.collection('users').doc(userId);
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!userData || !gangData || userData.gangId !== gangId || userData.gangRole !== 'leader') {
          throw new Error('Unauthorized');
        }

        const gangInventory = gangData.inventory || {};
        const currentGangAmount = gangInventory[itemId] || 0;

        if (currentGangAmount < amount) {
          throw new Error('Insufficient items in gang inventory');
        }

        // Determine item type (weapons, drugs, armor, tools)
        // This is a bit tricky without a global item registry, but we can infer it or pass it from client
        // For now, let's assume the client passes the itemType too for simplicity, or we try to find it.
        const itemType = req.body.itemType; // weapons, drugs, armor, tools

        // Update gang inventory
        transaction.update(gangRef, {
          [`inventory.${itemId}`]: FieldValue.increment(-amount)
        });

        // Update user inventory
        transaction.update(userRef, {
          [`inventory.${itemType}.${itemId}`]: FieldValue.increment(amount)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  // Manual grant money endpoint removed as requested (automated now)
  /*
  app.post('/api/ministry/grant-money', async (req, res) => {
    ...
  });
  */

  app.post('/api/government/allocate-budget', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { pmId, roleId, amount } = req.body;

    if (!pmId || !roleId || amount === undefined) {
      return res.status(400).json({ error: 'معلومات الطلب غير مكتملة' });
    }

    try {
      const govRef = db.collection('government').doc('current');
      const pmDoc = await db.collection('users').doc(pmId).get();
      const govDoc = await govRef.get();

      if (!pmDoc.exists || !govDoc.exists) {
        return res.status(404).json({ error: 'البيانات غير موجودة' });
      }

      const govData = govDoc.data()!;
      if (govData.primeMinisterId !== pmId) {
        return res.status(403).json({ error: 'غير مصرح لك: أنت لست رئيس الوزراء' });
      }

      await govRef.update({
        [`budgets.${roleId}`]: amount
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  // AI Worker Loop (every 1 minute)
  setInterval(async () => {
    if (!db) return;
    
    console.log('AI Worker running...');
    
    try {
      // 1. Ammo Factory Production (Existing)
      // ... (existing logic)

      // 2. Election & Corruption Logic
      const govDoc = await db.collection('government').doc('current').get();
      const govData = govDoc.data();
      
      if (govData) {
        // --- Automated Budget Distribution ---
        const now = new Date();
        const baghdadOffset = 3 * 60 * 60 * 1000;
        const baghdadNow = new Date(now.getTime() + baghdadOffset);
        const todayBaghdad = baghdadNow.toISOString().split('T')[0];
        
        const shouldRunDistribution = govData.lastDistributionDate !== todayBaghdad || govData.forceDistribution === true;

        if (shouldRunDistribution) {
          console.log('Starting budget distribution (Baghdad Time: ' + baghdadNow.toISOString() + ')...');
          console.log('Force distribution flag:', govData.forceDistribution);
          
          const ministerialRoles = [
            'interior', 'defense', 'foreign', 'finance', 'health', 
            'industry', 'oil', 'electricity', 'labor', 'intelligence', 'security'
          ];

          const humorMessages = [
            "الوزارة تگولك هاي مليون مكرمة، اصرفها بالعافية ولا تسأل منين جتي!",
            "هاي مليون من ميزانية الوزارة، حصتك من النفط وصلت، لتگول الحكومة مقصرة!",
            "السيد الوزير يگولك هاي مليون هدية، اشتري بيها صمون حار وادعيلنا بالانتخابات.",
            "الوزارة دزتلك مليون، هاي حصتك من الميزانية، اصرفها وسكت لا تطلع مظاهرات!",
            "استلم مليون من الوزارة، هاي هدية بمناسبة 'الصمود والتصدي'، دير بالك تسأل عن المصدر!",
            "الوزير يگولك هاي مليون، حصتك من خيرات البلد، لتگول ماكو تعيينات!",
            "هاي مليون من الوزارة، مكرمة سياسية فكاهية، اصرفها وانسى الوعود الانتخابية!",
            "الوزارة تگولك هاي مليون، حصتك من الواردات، لتگول الحكومة بس تاخذ ما تنطي!"
          ];

          // Get eligible players (cleanMoney < 10,000,000 as per UI description)
          // Relying on fetching all users and filtering in memory, similar to the Admin players list
          const allUsersSnapshot = await db.collection('users').get();
          
          let eligibleUsers = allUsersSnapshot.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => (u.cleanMoney || 0) < 10000000);

          if (eligibleUsers.length === 0) {
            console.log('No eligible users found with < 10M, picking from all users...');
            eligibleUsers = allUsersSnapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
          }

          console.log('Eligible users for distribution:', eligibleUsers.length);

          if (eligibleUsers.length > 0) {
            for (const role of ministerialRoles) {
              const cabinet = govData.cabinet || {};
              const minister = cabinet[role];
              // Removed minister check to allow distribution even if vacant

              // Pick 10 random users from eligible list
              const shuffled = [...eligibleUsers].sort(() => 0.5 - Math.random());
              const selected = shuffled.slice(0, 10);
              console.log(`Distributing for role: ${role}, selected ${selected.length} users.`);

              for (const user of selected) {
                const randomMsg = humorMessages[Math.floor(Math.random() * humorMessages.length)];
                const ministerName = (minister && typeof minister.displayName === 'string') ? minister.displayName : 'الوزارة';
                
                // ... (rest of the distribution logic)
              }
            }
          }
          
          await db.collection('government').doc('current').update({ lastDistributionDate: todayBaghdad, forceDistribution: false });
        }
      }

      // 3. Hourly Message Deletion
      const lastDeletion = govData?.lastMessageDeletion || 0;
      if (Date.now() - lastDeletion > 3600000) {
        console.log('Running hourly message deletion...');
        const messagesRef = db.collection('messages');
        const snapshot = await messagesRef.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await db.collection('government').doc('current').update({ lastMessageDeletion: Date.now() });
        console.log(`Deleted ${snapshot.size} messages.`);
      }

        // 2. Seat Distribution Logic (based on votes)
        const gangVotes = govData.gangVotes || {};
        const totalVotes = Object.values(gangVotes).reduce((a: any, b: any) => a + b, 0) as number;
        
        if (totalVotes > 0) {
          const newSeats: any = {};
          Object.entries(gangVotes).forEach(([gangId, votes]: [string, any]) => {
            newSeats[gangId] = Math.floor((votes / totalVotes) * 150);
          });
          await govDoc.ref.update({ gangSeats: newSeats });
        }

        // 3. Election & Corruption Logic
        const electionDate = new Date(govData.electionTimestamp);
        if (new Date() > electionDate) {
          // Run Election
          console.log('Running election...');
          // Logic to determine new PM based on parliament seats
          // ...
          await govDoc.ref.update({
            electionTimestamp: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
        
        // Corruption Income
        const pmGangId = govData.primeMinisterGangId;
        if (pmGangId) {
          const gangMembers = await db.collection('users').where('gangId', '==', pmGangId).get();
          for (const memberDoc of gangMembers.docs) {
            await memberDoc.ref.update({
              'cleanMoney': (memberDoc.data().cleanMoney || 0) + 500000 // Massive hourly corruption
            });
          }
        }
    } catch (error) {
      console.error('Error in AI Worker:', error);
    }
  }, 60000);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Server Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Ensure API routes return JSON 404, not index.html
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'Not Found', message: `API route ${req.originalUrl} not found` });
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening at the end
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
