import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  isActive: Boolean,
  lastLoginAt: Date,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdminAccount() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'superadmin@aromaherbal.com';
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail }).select("-passwordHash");
    if (existingAdmin) {
      console.log('⚠️  Administrator account already exists!');
      console.log('📧 Email:', adminEmail);
      console.log('👤 Name:', existingAdmin.name);
      console.log('🔑 Role:', existingAdmin.role);
      await mongoose.connection.close();
      return;
    }

    // Create new admin account
    const password = 'SuperAdmin@2024';
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = new User({
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'Administrator',
      isActive: true,
      lastLoginAt: null,
    });

    await admin.save();

    console.log('\n✅ Administrator account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminEmail);
    console.log('🔑 Password: ', password);
    console.log('👤 Name:     ', 'System Administrator');
    console.log('🛡️  Role:     ', 'Administrator');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Save these credentials in a secure location!');
    console.log('💡 You can now log in at: http://127.0.0.1:5173\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating administrator account:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdminAccount();
