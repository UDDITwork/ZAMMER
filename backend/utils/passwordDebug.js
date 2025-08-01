const bcrypt = require('bcryptjs');
const Seller = require('../models/Seller');

// Utility to check and fix password hashing issues
const debugPasswordIssues = async () => {
  try {
    console.log('🔍 [PasswordDebug] Starting password analysis...');
    
    const sellers = await Seller.find({}).select('email password firstName');
    
    console.log(`📊 [PasswordDebug] Found ${sellers.length} sellers`);
    
    let issuesFound = 0;
    let fixedCount = 0;
    
    for (const seller of sellers) {
      const passwordLength = seller.password?.length || 0;
      const isHashed = passwordLength > 20; // bcrypt hashes are typically 60+ characters
      
      console.log(`🔍 [PasswordDebug] Seller: ${seller.email}`, {
        passwordLength: passwordLength,
        isHashed: isHashed,
        firstName: seller.firstName
      });
      
      if (!isHashed && passwordLength > 0) {
        console.log(`⚠️ [PasswordDebug] Found unhashed password for: ${seller.email}`);
        issuesFound++;
        
        // Fix: Hash the password properly
        try {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(seller.password, salt);
          
          seller.password = hashedPassword;
          seller.markModified('password');
          await seller.save();
          
          console.log(`✅ [PasswordDebug] Fixed password for: ${seller.email}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ [PasswordDebug] Failed to fix password for: ${seller.email}`, error);
        }
      }
    }
    
    console.log('📊 [PasswordDebug] Analysis complete:', {
      totalSellers: sellers.length,
      issuesFound: issuesFound,
      fixedCount: fixedCount
    });
    
    return { issuesFound, fixedCount };
  } catch (error) {
    console.error('❌ [PasswordDebug] Error during analysis:', error);
    throw error;
  }
};

// Test password comparison for a specific seller
const testPasswordComparison = async (email, testPassword) => {
  try {
    console.log(`🔍 [PasswordTest] Testing password for: ${email}`);
    
    const seller = await Seller.findOne({ email });
    if (!seller) {
      console.log('❌ [PasswordTest] Seller not found');
      return false;
    }
    
    console.log('📊 [PasswordTest] Seller details:', {
      email: seller.email,
      passwordLength: seller.password?.length || 0,
      isHashed: seller.password?.length > 20
    });
    
    const isMatch = await seller.matchPassword(testPassword);
    
    console.log('🔍 [PasswordTest] Comparison result:', {
      testPassword: testPassword,
      isMatch: isMatch
    });
    
    return isMatch;
  } catch (error) {
    console.error('❌ [PasswordTest] Error:', error);
    return false;
  }
};

module.exports = {
  debugPasswordIssues,
  testPasswordComparison
}; 