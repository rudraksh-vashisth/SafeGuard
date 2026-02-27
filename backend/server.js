require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const twilio = require('twilio');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();

// ============================================================
// 1. GLOBAL CONFIG & SECURITY CONSTANTS
// ============================================================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "safeguard_emergency_system_master_key_2024";
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safeguard';

// 📱 TWILIO INITIALIZATION (ADDED BACK)
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("🛡️  Communication Shield: Twilio API Active");
} else {
    console.log("⚠️  Communication Shield: Twilio keys missing (Terminal only mode)");
}

// ============================================================
// 2. GLOBAL SECURITY MIDDLEWARE
// ============================================================
app.use(helmet()); 

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Emergency-Signal']
}));

app.use(express.json({ limit: '10kb' })); 

// 🛡️ NO-SQL INJECTION PROTECTION (Fixed to prevent "getter" error)
app.use(mongoSanitize({ replaceWith: '_' }));

app.use((req, res, next) => {
    const sanitize = (obj) => {
        if (obj instanceof Object) {
            for (let key in obj) {
                if (key.startsWith('$')) {
                    delete obj[key];
                } else {
                    sanitize(obj[key]);
                }
            }
        }
    };
    sanitize(req.body);
    sanitize(req.params);
    sanitize(req.query);
    next();
});

// ============================================================
// 3. DATABASE CONNECTION
// ============================================================
mongoose.connect(MONGO_URI)
    .then(() => {
        const dbSource = process.env.MONGO_URI ? "MongoDB Atlas (Cloud)" : "Local Laptop Database";
        console.log(`✅ Secure Shield Database: CONNECTED (${dbSource})`);
    })
    .catch(err => console.log("❌ Shield Database Connection Error:", err));

// ============================================================
// 4. ENHANCED USER SCHEMA
// ============================================================
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false }, 
    
    emergencyContacts: [{
        name: String,
        phone: String,
        relationship: String,
        priority: { type: Number, default: 1 },
        isVerified: { type: Boolean, default: false },
        permissions: { canViewLiveLocation: { type: Boolean, default: true } }
    }],

    activeSOS: { type: Boolean, default: false },
    lastLocation: { lat: Number, lng: Number, accuracy: Number, timestamp: Date },
    auditLog: [{ action: String, timestamp: { type: Date, default: Date.now }, ip: String }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ============================================================
// 5. AUTHENTICATION (Register/Login)
// ============================================================

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.status(400).json({ error: "Account already exists." });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ fullName, email, password: hashedPassword, phone });
        await newUser.save();
        
        res.status(201).json({ message: "Registration Successful" });
    } catch (error) {
        res.status(500).json({ error: "Signup system error." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Missing fields" });

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ 
            token, 
            user: { fullName: user.fullName, email: user.email, id: user._id } 
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ error: "Login system failure." });
    }
});

// ============================================================
// 6. GUARDIAN MANAGEMENT
// ============================================================

app.get('/api/user/contacts', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        res.json(user.emergencyContacts);
    } catch (error) {
        res.status(401).json({ error: "Unauthorized access." });
    }
});

app.post('/api/user/contacts', async (req, res) => {
    try {
        const { name, phone, relationship, priority, permissions } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const user = await User.findById(decoded.id);
        if (user.emergencyContacts.length >= 5) return res.status(400).json({ error: "Circle full (Max 5)" });

        user.emergencyContacts.push({ name, phone, relationship, priority, permissions });
        await user.save();
        res.status(201).json({ message: "Guardian added to secure circle." });
    } catch (error) {
        res.status(500).json({ error: "Failed to add contact." });
    }
});

app.delete('/api/user/contacts/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $pull: { emergencyContacts: { _id: req.params.id } } });
        res.json({ message: "Guardian removed safely." });
    } catch (error) {
        res.status(500).json({ error: "Delete failed." });
    }
});

// ============================================================
// 7. SECURE SOS DISPATCH (Twilio Enabled)
// ============================================================
const sosLimiter = rateLimit({ windowMs: 60000, max: 3 });

app.post('/api/sos/trigger', sosLimiter, async (req, res) => {
    try {
        const { location, note, accuracy, timestamp } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.emergencyContacts.length === 0) {
            return res.status(400).json({ error: "Guardian Circle is empty." });
        }

        const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
        
        user.activeSOS = true;
        user.lastLocation = { ...location, accuracy, timestamp: timestamp || new Date() };
        user.auditLog.push({ action: "SOS_TRIGGERED", ip: req.ip });
        await user.save();

        console.log(`\n🚨 ALERT: ${user.fullName.toUpperCase()} is in danger!`);

        const sortedGuardians = user.emergencyContacts.sort((a, b) => a.priority - b.priority);

        if (twilioClient) {
            sortedGuardians.forEach(async (guardian) => {
                try {
                    // Call Priority 1 Guardian
                    if(guardian.priority === 1) {
                        await twilioClient.calls.create({
                            twiml: `<Response><Say voice="alice">Emergency alert for ${user.fullName}. They are in trouble. A location link has been sent to your phone.</Say></Response>`,
                            to: guardian.phone,
                            from: process.env.TWILIO_PHONE_NUMBER
                        });
                    }
                    // Send SMS to all
                    await twilioClient.messages.create({
                        body: `🚨 SOS from ${user.fullName}: ${note || 'Needs help!'}. Track Live: ${mapLink}`,
                        to: guardian.phone,
                        from: process.env.TWILIO_PHONE_NUMBER
                    });
                } catch (e) { console.error(`Twilio error for ${guardian.name}:`, e.message); }
            });
        } else {
            sortedGuardians.forEach(g => console.log(`[SIMULATED SMS] To: ${g.name} -> HELP AT: ${mapLink}`));
        }

        res.json({ success: true, contactsNotified: user.emergencyContacts.length });
    } catch (error) {
        res.status(401).json({ error: "Emergency system failure." });
    }
});

// ============================================================
// 8. START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 SafeGuard Shield Active on Port ${PORT}`);
    console.log(`🛡️  Advanced API Protections: ENABLED`);
});