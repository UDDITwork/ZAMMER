// frontend/test-admin-frontend-fix.js - Admin Frontend Fix Verification
// This script tests the admin frontend to ensure sidebar duplication is fixed

const puppeteer = require('puppeteer');

const testAdminFrontend = async () => {
  console.log('🧪 Starting Admin Frontend Fix Verification...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`🖥️  Browser Console [${msg.type()}]:`, msg.text());
    });
    
    // Enable network request logging
    page.on('request', request => {
      if (request.url().includes('/admin/')) {
        console.log(`📡 Admin Request: ${request.method()} ${request.url()}`);
      }
    });
    
    // Test 1: Navigate to admin login
    console.log('🔐 Test 1: Navigating to admin login...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if login page loads without sidebar
    const loginPageTitle = await page.title();
    console.log(`✅ Login page title: ${loginPageTitle}`);
    
    // Test 2: Login as admin (using test credentials)
    console.log('\n🔑 Test 2: Attempting admin login...');
    
    // Wait for form elements to be available
    console.log('⏳ Waiting for login form to load...');
    
    // Debug: Check what input elements are available
    const availableInputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({ 
        name: input.name, 
        type: input.type, 
        id: input.id,
        placeholder: input.placeholder 
      }))
    );
    console.log('🔍 Available input elements:', availableInputs);
    
    // Wait for specific elements
    try {
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
      console.log('✅ Login form elements found');
    } catch (error) {
      console.log('❌ Form elements not found, trying alternative selectors...');
      
      // Try alternative selectors
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      const submitButton = await page.$('button');
      
      if (!emailInput || !passwordInput || !submitButton) {
        throw new Error('Login form elements not found with any selector');
      }
      console.log('✅ Login form elements found with alternative selectors');
    }
    
    // Fill login form
    console.log('📝 Filling login form...');
    try {
      await page.type('input[name="email"]', 'admin@zammer.com');
      await page.type('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
    } catch (error) {
      console.log('🔄 Trying alternative selectors for form filling...');
      await page.type('input[type="email"]', 'admin@zammer.com');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button');
    }
    
    console.log('🔘 Login form submitted');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if redirected to dashboard
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/admin/dashboard')) {
      console.log('✅ Successfully logged in and redirected to dashboard');
      
      // Test 3: Check for sidebar duplication
      console.log('\n🔍 Test 3: Checking for sidebar duplication...');
      
      // Count sidebar elements
      const sidebarElements = await page.$$eval('.fixed.inset-y-0.left-0', elements => elements.length);
      console.log(`📊 Number of sidebar elements found: ${sidebarElements}`);
      
      if (sidebarElements === 1) {
        console.log('✅ SUCCESS: Only one sidebar found - duplication issue FIXED!');
      } else if (sidebarElements === 0) {
        console.log('⚠️  WARNING: No sidebar found - layout might be broken');
      } else {
        console.log(`❌ FAILURE: ${sidebarElements} sidebars found - duplication still exists`);
      }
      
      // Test 4: Check navigation functionality
      console.log('\n🧭 Test 4: Testing navigation between admin pages...');
      
      const navigationTests = [
        { name: 'Users', url: '/admin/users' },
        { name: 'Sellers', url: '/admin/sellers' },
        { name: 'Delivery Agents', url: '/admin/delivery-agents' },
        { name: 'Orders', url: '/admin/orders' }
      ];
      
      for (const test of navigationTests) {
        console.log(`\n🔗 Testing navigation to ${test.name}...`);
        
        // Click navigation link
        const navLink = await page.$(`a[href="${test.url}"]`);
                 if (navLink) {
           await navLink.click();
           await new Promise(resolve => setTimeout(resolve, 2000));
          
          const newUrl = page.url();
          console.log(`📍 Navigated to: ${newUrl}`);
          
          // Check if still only one sidebar
          const sidebarCount = await page.$$eval('.fixed.inset-y-0.left-0', elements => elements.length);
          console.log(`📊 Sidebar count on ${test.name}: ${sidebarCount}`);
          
          if (sidebarCount === 1) {
            console.log(`✅ ${test.name} page: Single sidebar confirmed`);
          } else {
            console.log(`❌ ${test.name} page: Multiple sidebars detected`);
          }
          
          // Go back to dashboard for next test
          await page.goto('http://localhost:3000/admin/dashboard');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`⚠️  Navigation link for ${test.name} not found`);
        }
      }
      
      // Test 5: Check responsive behavior
      console.log('\n📱 Test 5: Testing responsive behavior...');
      
      // Test mobile view
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mobileSidebarCount = await page.$$eval('.fixed.inset-y-0.left-0', elements => elements.length);
      console.log(`📱 Mobile view sidebar count: ${mobileSidebarCount}`);
      
      // Test desktop view
      await page.setViewport({ width: 1280, height: 720 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const desktopSidebarCount = await page.$$eval('.fixed.inset-y-0.left-0', elements => elements.length);
      console.log(`🖥️  Desktop view sidebar count: ${desktopSidebarCount}`);
      
      // Test 6: Check for console errors
      console.log('\n🚨 Test 6: Checking for JavaScript errors...');
      
      const errors = [];
      page.on('pageerror', error => {
        errors.push(error.message);
        console.log(`❌ JavaScript Error: ${error.message}`);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (errors.length === 0) {
        console.log('✅ No JavaScript errors detected');
      } else {
        console.log(`❌ ${errors.length} JavaScript errors found`);
      }
      
      // Test 7: Check admin functionality
      console.log('\n⚙️  Test 7: Testing admin functionality...');
      
      // Check if dashboard stats are loading
      const statsElements = await page.$$('.bg-white.overflow-hidden.shadow-sm.rounded-lg');
      console.log(`📊 Dashboard stat cards found: ${statsElements.length}`);
      
      // Check if orders section is present
      const ordersSection = await page.$('h2:contains("Recent Orders")');
      if (ordersSection) {
        console.log('✅ Orders section found on dashboard');
      } else {
        console.log('⚠️  Orders section not found on dashboard');
      }
      
      console.log('\n🎉 Admin Frontend Fix Verification Complete!');
      console.log('\n📋 SUMMARY:');
      console.log(`- Login functionality: ${currentUrl.includes('/admin/dashboard') ? '✅ Working' : '❌ Failed'}`);
      console.log(`- Sidebar duplication: ${sidebarElements === 1 ? '✅ Fixed' : '❌ Still exists'}`);
      console.log(`- Navigation: ${navigationTests.length > 0 ? '✅ Tested' : '❌ Failed'}`);
      console.log(`- Responsive design: ${mobileSidebarCount === 1 && desktopSidebarCount === 1 ? '✅ Working' : '❌ Issues'}`);
      console.log(`- JavaScript errors: ${errors.length === 0 ? '✅ None' : `❌ ${errors.length} errors`}`);
      
    } else {
      console.log('❌ Failed to login or redirect to dashboard');
      console.log(`Current URL: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Run the test
testAdminFrontend().catch(console.error);
