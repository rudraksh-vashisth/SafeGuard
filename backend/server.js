require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const twilio = require('twilio');
const rateLimit = require('express-rate-limit');

const app = express();

// ============================================================
// 1. GLOBAL CONFIG & SECURITY CONSTANTS
// ============================================================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "safeguard_emergency_system_master_key_2024";
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safeguard';

// Initialize Twilio
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("🛡️  Communication Shield: Twilio API Active");
}

// ============================================================
// 2. GLOBAL SECURITY MIDDLEWARE (EXPRESS 5 & RENDER STABLE)
// ============================================================
app.use(helmet()); 

// 🛡️ ADVANCED CORS CONFIGURATION
app.use(cors({
    origin: [
        'https://safe-guard-opal.vercel.app', // Add this new URL
        'https://safe-guard-pgme.vercel.app', 
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Emergency-Signal'],
    credentials: true
}));

/**
 * 🚀 EXPRESS 5 FIX
 * We use the /.*/ //regex object here. 
//  * This is the ONLY way to do a global wildcard in Express 5 without a PathError.
 
app.options(/.*/, cors());

// Body parser with size limit
app.use(express.json({ limit: '10kb' })); 

/**
 * 🛡️ RECURSIVE SECURITY SHIELD 
 * Manually removes NoSQL injection ($) and XSS (<script>) 
 */
const cleanData = (obj) => {
    if (obj instanceof Object) {
        for (let key in obj) {
            if (key.startsWith('$')) {
                delete obj[key];
            } else if (typeof obj[key] === 'string') {
                obj[key] = obj[key].replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
            } else {
                cleanData(obj[key]);
            }
        }
    }
};

app.use((req, res, next) => {
    cleanData(req.body);
    cleanData(req.query);
    cleanData(req.params);
    next();
});

// Apply the Security Shield to all incoming requests
app.use((req, res, next) => {
    cleanData(req.body);
    cleanData(req.query);
    cleanData(req.params);
    next();
});

// ============================================================
// 3. DATABASE CONNECTION
// ============================================================
mongoose.connect(MONGO_URI)
    .then(() => {
        const dbSource = process.env.MONGO_URI ? "Cloud Atlas" : "Local Database";
        console.log(`✅ Secure Shield Database: CONNECTED (${dbSource})`);
    })
    .catch(err => {
        console.log("❌ Shield Database Connection Error:", err.message);
    });

// ============================================================
// 4. USER SCHEMA & MODEL
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
// 5. ESSENTIAL SYSTEM ROUTES
// ============================================================

// ROOT ROUTE: Fixes "Cannot GET /"
app.get('/', (req, res) => {
    res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 100px; background: #0f1115; color: white; height: 100vh;">
            <h1 style="color: #ff4b5c; font-size: 3rem;">🛡️ SafeGuard</h1>
            <p style="font-size: 1.2rem; opacity: 0.8;">Secure Emergency Response Server is LIVE</p>
            <div style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.05); display: inline-block; border-radius: 10px;">
                Status: <span style="color: #00ff88;">Ready for Requests</span>
            </div>
        </div>
    `);
});

// HEALTH CHECK: For Render monitoring
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "Live", db: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected" });
});

// ============================================================
// 6. AUTHENTICATION (Register/Login)
// ============================================================

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return res.status(400).json({ error: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ fullName, email, password: hashedPassword, phone });
        await newUser.save();
        res.status(201).json({ message: "Account Created" });
    } catch (error) {
        res.status(500).json({ error: "Registration failed." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { fullName: user.fullName, email: user.email, id: user._id } });
    } catch (error) {
        res.status(500).json({ error: "Login failed." });
    }
});

// ============================================================
// 7. GUARDIAN MANAGEMENT
// ============================================================

app.get('/api/user/contacts', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        res.json(user.emergencyContacts);
    } catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.post('/api/user/contacts', async (req, res) => {
    try {
        const { name, phone, relationship, priority, permissions } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user.emergencyContacts.length >= 5) return res.status(400).json({ error: "Circle Full" });
        user.emergencyContacts.push({ name, phone, relationship, priority, permissions });
        await user.save();
        res.status(201).json({ message: "Contact Added" });
    } catch (error) {
        res.status(500).json({ error: "Add failed" });
    }
});

app.delete('/api/user/contacts/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { $pull: { emergencyContacts: { _id: req.params.id } } });
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
});

// ============================================================
// 8. SECURE SOS DISPATCH (With Dynamic Tracking Link)
// ============================================================
const sosLimiter = rateLimit({ windowMs: 60000, max: 3 });

app.post('/api/sos/trigger', sosLimiter, async (req, res) => {
    try {
        const { location, note, accuracy, timestamp } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.emergencyContacts.length === 0) return res.status(400).json({ error: "No guardians found in circle." });

        // 🛡️ GENERATE DYNAMIC TRACKING LINK
        // Replace 'your-app.netlify.app' with your actual Netlify/Vercel URL
        const trackingLink = `https://safe-guard-pgme.vercel.app/pages/track-user.html?id=${user._id}`;

        // Prepare the professional alert message
        const alertMessage = `🚨 EMERGENCY: ${user.fullName.toUpperCase()} needs help!\nNote: ${note || 'Immediate assistance required.'}\n\nTrack Live Location: ${trackingLink}`;

        // Update State & Audit Logging
        user.activeSOS = true;
        user.lastLocation = { ...location, accuracy, timestamp: timestamp || new Date() };
        user.auditLog.push({ action: "SOS_TRIGGERED", ip: req.ip });
        await user.save();

        console.log(`🚨 SOS BROADCAST: ${user.fullName} | ID: ${user._id}`);

        if (twilioClient) {
            const sortedGuardians = user.emergencyContacts.sort((a, b) => a.priority - b.priority);

            sortedGuardians.forEach(async (g) => {
                try {
                    // 📞 1. Priority 1 gets a Voice Call
                    if (g.priority === 1) {
                        await twilioClient.calls.create({
                            twiml: `<Response><Say voice="alice">Emergency alert for ${user.fullName}. They are in trouble. A live tracking link has been sent to your phone. Please check your messages immediately.</Say></Response>`,
                            to: g.phone,
                            from: process.env.TWILIO_PHONE_NUMBER
                        });
                    }

                    // 📱 2. All guardians get the professional SMS with the tracking link
                    await twilioClient.messages.create({
                        body: alertMessage,
                        to: g.phone,
                        from: process.env.TWILIO_PHONE_NUMBER
                    });

                } catch (e) {
                    console.error(`[Twilio Error] Failed to reach ${g.name}:`, e.message);
                }
            });
        } else {
            console.warn("⚠️ Twilio not configured. Alert logged to terminal only:");
            console.log(alertMessage);
        }

        res.json({
            success: true,
            message: "SOS signals broadcasted to all guardians.",
            contactsNotified: user.emergencyContacts.length
        });

    } catch (error) {
        console.error("SOS System Error:", error.message);
        res.status(401).json({ error: "Unauthorized or SOS dispatch failed." });
    }
});


// ============================================================
// 9. AI SAFE ROUTE ANALYZER (Gemini API)
// ============================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/ai/safe-route', async (req, res) => {
    try {
        const { prompt } = req.body;

        // 🛡️ SECURITY: Check if user is authenticated
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        // Verify token (optional but good practice)
        jwt.verify(token, JWT_SECRET);

        // 🧠 PROMPT ENGINEERING: Crafting the perfect prompt for safety analysis
        const systemPrompt = `
            You are the "SafeRoute AI", a specialized safety analysis engine for a women's safety app.
            Your goal is to analyze a given route (start to destination) and provide a detailed safety report.
            
            CRITICAL INSTRUCTIONS:
            1. Analyze the route based on general safety principles (avoid dark alleys, isolated areas).
            2. If the user mentions specific landmarks, assume they are in a populated area.
            3. Provide a "Safety Score" (0-100).
            4. Provide a "Verdict" (Safe, Caution Advised, Not Recommended).
            5. Give actionable "Safety Tips" specific to the route.
            6. Format the output strictly in Markdown for HTML rendering.
            
            OUTPUT FORMAT:
            ### Route Analysis
            <p><b>Start:</b> [Start Location]</p>
            <p><b>Destination:</b> [Destination Location]</p>
            <p><b>Safety Score:</b> [Number]/100</p>
            <p><b>Verdict:</b> [Verdict]</p>
            
            ### Safety Report
            <p>[Detailed analysis paragraph]</p>
            
            ### Safety Tips
            <ul>
                <li>[Tip 1]</li>
                <li>[Tip 2]</li>
                <li>[Tip 3]</li>
            </ul>
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: systemPrompt
        });

        const responseText = result.response.text();

        res.json({ report: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AI Analysis failed. Please try again." });
    }
});


// ============================================================
// 10. START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 SafeGuard Shield Active on Port ${PORT}`);
});

app.use(cors({
    origin: ['https://safe-guard-pgme.vercel.app', 'http://127.0.0.1:5500'], // Allow both live and local
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Emergency-Signal'],
    credentials: true
}));