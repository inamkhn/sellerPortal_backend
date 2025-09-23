#!/usr/bin/env python3
"""
Facebook Marketplace Automation Script
This script automates posting products to Facebook Marketplace using Selenium WebDriver.
"""

import sys
import json
import time
import os
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, WebDriverException
except ImportError as e:
    print(f"ERROR: Missing required package: {e}")
    print("Please install selenium: pip install selenium")
    sys.exit(1)

class FacebookMarketplaceAutomation:
    def __init__(self, chrome_user_data_dir: str, chrome_profile: str = "Default"):
        self.chrome_user_data_dir = chrome_user_data_dir
        self.chrome_profile = chrome_profile
        self.driver: Optional[webdriver.Chrome] = None
        self.wait: Optional[WebDriverWait] = None
        
    def setup_driver(self) -> bool:
        """Initialize Chrome WebDriver with user profile"""
        try:
            chrome_options = Options()
            chrome_options.add_argument(f"--user-data-dir={self.chrome_user_data_dir}")
            chrome_options.add_argument(f"--profile-directory={self.chrome_profile}")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Try to find Chrome executable
            chrome_paths = [
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            ]
            
            chrome_executable = None
            for path in chrome_paths:
                if os.path.exists(path):
                    chrome_executable = path
                    break
                    
            if chrome_executable:
                chrome_options.binary_location = chrome_executable
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.wait = WebDriverWait(self.driver, 30)
            
            print("Chrome WebDriver initialized successfully")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to initialize Chrome WebDriver: {e}")
            return False
    
    def navigate_to_marketplace(self) -> bool:
        """Navigate to Facebook Marketplace"""
        try:
            self.driver.get("https://www.facebook.com/marketplace/create/item")
            time.sleep(3)
            
            # Check if we're logged in
            if "login" in self.driver.current_url.lower():
                print("ERROR: Not logged into Facebook. Please log in manually first.")
                return False
                
            print("Successfully navigated to Facebook Marketplace")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to navigate to marketplace: {e}")
            return False
    
    def post_product(self, product_data: Dict[str, Any]) -> Optional[str]:
        """Post a product to Facebook Marketplace"""
        try:
            # Fill in product title
            title_input = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='What are you selling?']"))
            )
            title_input.clear()
            title_input.send_keys(product_data.get('title', ''))
            time.sleep(1)
            
            # Fill in price
            price_input = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Price']"))
            )
            price_input.clear()
            price_input.send_keys(str(product_data.get('price', '')))
            time.sleep(1)
            
            # Fill in description
            description_textarea = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Describe your item']"))
            )
            description_textarea.clear()
            description_textarea.send_keys(product_data.get('description', ''))
            time.sleep(1)
            
            # Upload images if provided
            if product_data.get('images'):
                self.upload_images(product_data['images'])
            
            # Select category (simplified - would need more complex logic for real implementation)
            # This is a placeholder for category selection
            
            # Submit the listing
            submit_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[@aria-label='Next' or @aria-label='Publish']"))
            )
            submit_button.click()
            
            # Wait for success and extract listing URL
            time.sleep(5)
            listing_url = self.extract_listing_url()
            
            if listing_url:
                print(f"SUCCESS: Product posted successfully: {listing_url}")
                return listing_url
            else:
                print("WARNING: Product may have been posted but URL not found")
                return None
                
        except TimeoutException:
            print("ERROR: Timeout while posting product - elements not found")
            return None
        except Exception as e:
            print(f"ERROR: Failed to post product: {e}")
            return None
    
    def upload_images(self, image_paths: list) -> bool:
        """Upload product images"""
        try:
            file_input = self.driver.find_element(By.XPATH, "//input[@type='file']")
            
            for image_path in image_paths:
                if os.path.exists(image_path):
                    file_input.send_keys(os.path.abspath(image_path))
                    time.sleep(2)
                else:
                    print(f"WARNING: Image not found: {image_path}")
            
            return True
        except Exception as e:
            print(f"ERROR: Failed to upload images: {e}")
            return False
    
    def extract_listing_url(self) -> Optional[str]:
        """Extract the listing URL after successful posting"""
        try:
            # This would need to be implemented based on Facebook's actual response
            # For now, return a placeholder
            current_url = self.driver.current_url
            if "marketplace/item" in current_url:
                return current_url
            return None
        except Exception as e:
            print(f"ERROR: Failed to extract listing URL: {e}")
            return None
    
    def take_screenshot(self, filename: str = None) -> str:
        """Take a screenshot for debugging"""
        try:
            if not filename:
                filename = f"screenshot_{int(time.time())}.png"
            
            screenshot_path = os.path.join(os.getcwd(), "temp", "facebook", filename)
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            
            self.driver.save_screenshot(screenshot_path)
            print(f"Screenshot saved: {screenshot_path}")
            return screenshot_path
        except Exception as e:
            print(f"ERROR: Failed to take screenshot: {e}")
            return ""
    
    def cleanup(self):
        """Clean up resources"""
        if self.driver:
            self.driver.quit()
            print("WebDriver closed")

def main():
    if len(sys.argv) != 2:
        print("Usage: python facebook_automation.py <product_data_file>")
        sys.exit(1)
    
    product_file = sys.argv[1]
    
    # Load product data
    try:
        with open(product_file, 'r', encoding='utf-8') as f:
            product_data = json.load(f)
    except Exception as e:
        print(f"ERROR: Failed to load product data: {e}")
        sys.exit(1)
    
    # Get Chrome user data directory from environment or use default
    chrome_user_data_dir = os.getenv(
        'FACEBOOK_CHROME_USER_DATA_DIR',
        os.path.expanduser('~\\AppData\\Local\\Google\\Chrome\\User Data')
    )
    chrome_profile = os.getenv('FACEBOOK_CHROME_PROFILE', 'Default')
    
    automation = FacebookMarketplaceAutomation(chrome_user_data_dir, chrome_profile)
    
    try:
        # Setup WebDriver
        if not automation.setup_driver():
            sys.exit(1)
        
        # Navigate to marketplace
        if not automation.navigate_to_marketplace():
            automation.take_screenshot("navigation_error.png")
            sys.exit(1)
        
        # Post the product
        listing_url = automation.post_product(product_data)
        
        if listing_url:
            print(f"LISTING_URL: {listing_url}")
            sys.exit(0)
        else:
            automation.take_screenshot("posting_error.png")
            sys.exit(1)
            
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        automation.take_screenshot("fatal_error.png")
        sys.exit(1)
    finally:
        automation.cleanup()

if __name__ == "__main__":
    main()