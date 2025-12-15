# MongoDB Connection Error Fix Guide

## 🔴 Error You're Seeing:
```
MongoDB Connection Failed: queryTxt ETIMEOUT cluster0.8m9iyqx.mongodb.net
```

This is a **DNS timeout error** when trying to connect to MongoDB Atlas.

---

## ✅ Quick Fixes (Try in Order)

### **Solution 1: Check MongoDB Atlas Cluster Status**

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Check if your cluster is **paused** (free tier clusters pause after inactivity)
3. If paused, click **"Resume"** to wake it up
4. Wait 2-3 minutes for the cluster to fully start
5. Try connecting again

---

### **Solution 2: Use Local MongoDB (Recommended for Development)**

If you have MongoDB installed locally, switch to local database:

1. **Create/Update `.env` file:**
   ```env
   MONGO_URI=mongodb://localhost:27017/pak-mobile-store
   ```

2. **Make sure MongoDB is running locally:**
   ```bash
   # Windows (if MongoDB is installed as service, it should auto-start)
   # Or start manually:
   mongod
   ```

3. **Restart your Node.js server**

---

### **Solution 3: Fix MongoDB Atlas Connection**

If you want to use MongoDB Atlas:

1. **Check your `.env` file:**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster0.8m9iyqx.mongodb.net/database-name?retryWrites=true&w=majority
   ```

2. **Verify:**
   - ✅ Username and password are correct
   - ✅ Database name is correct
   - ✅ Cluster is not paused
   - ✅ Your IP address is whitelisted in MongoDB Atlas Network Access

3. **Whitelist Your IP in MongoDB Atlas:**
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Add your current IP or use `0.0.0.0/0` for development (⚠️ not recommended for production)

---

### **Solution 4: Check Network/Firewall**

1. **Check Internet Connection:**
   - Make sure you have active internet connection
   - Try pinging: `ping cluster0.8m9iyqx.mongodb.net`

2. **Check Firewall/VPN:**
   - Disable VPN temporarily
   - Check if corporate firewall is blocking MongoDB ports
   - MongoDB Atlas uses port 27017

3. **Try Different Network:**
   - Switch to mobile hotspot
   - Try different WiFi network

---

### **Solution 5: Update Connection String**

If your MongoDB Atlas connection string is outdated:

1. **Get Fresh Connection String:**
   - Go to MongoDB Atlas → Clusters
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

2. **Update `.env` file:**
   ```env
   MONGO_URI=mongodb+srv://your-username:your-password@cluster0.8m9iyqx.mongodb.net/your-database?retryWrites=true&w=majority
   ```

---

## 🛠️ Step-by-Step: Switch to Local MongoDB

### **Step 1: Install MongoDB Locally (if not installed)**

**Windows:**
1. Download from: https://www.mongodb.com/try/download/community
2. Install MongoDB Community Server
3. MongoDB will run as a Windows service automatically

**Or use MongoDB via Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### **Step 2: Create `.env` File**

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection (Local)
MONGO_URI=mongodb://localhost:27017/pak-mobile-store

# JWT Configuration
JWT_SECRET=pak-mobile-store-super-secret-jwt-key-2025
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Client URL
CLIENT_URL=http://localhost:3000

# Order Prefixes
ORDER_PREFIX=ORD
TRACKING_PREFIX=EMB
```

### **Step 3: Verify MongoDB is Running**

```bash
# Check if MongoDB is running (Windows)
# Open Task Manager → Services → Look for "MongoDB"

# Or test connection:
mongosh mongodb://localhost:27017
```

### **Step 4: Restart Your Server**

```bash
npm run dev
# or
node server.js
```

---

## 🔍 Debugging Steps

### **Check Current MONGO_URI:**

Add this temporarily to your `server.js` or `app.js`:

```javascript
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Not Set");
// Don't log the full URI for security, just check if it exists
```

### **Test Connection Manually:**

```bash
# Test MongoDB Atlas connection
mongosh "mongodb+srv://username:password@cluster0.8m9iyqx.mongodb.net/database"

# Test local MongoDB
mongosh mongodb://localhost:27017/pak-mobile-store
```

---

## 📋 Common Error Messages & Solutions

| Error | Solution |
|-------|----------|
| `queryTxt ETIMEOUT` | Check internet, resume Atlas cluster, or use local MongoDB |
| `authentication failed` | Check username/password in connection string |
| `ENOTFOUND` | DNS resolution failed - check hostname or use local MongoDB |
| `connection timeout` | Increase timeout in connection options or check network |
| `cluster not found` | Cluster might be deleted or connection string is wrong |

---

## ✅ Recommended Setup for Development

**For local development, use local MongoDB:**

```env
MONGO_URI=mongodb://localhost:27017/pak-mobile-store
```

**Benefits:**
- ✅ No internet required
- ✅ Faster connection
- ✅ No cluster pause issues
- ✅ Free and unlimited

**For production, use MongoDB Atlas:**
- Better security
- Automatic backups
- Scalability
- Monitoring

---

## 🚀 Quick Test

After fixing, you should see:

```
🔄 Connecting to MongoDB...
✅ MongoDB Connected Successfully
📊 Database: pak-mobile-store
🔗 Host: localhost:27017
```

---

**Need more help?** Check the MongoDB Atlas documentation or use local MongoDB for development.

