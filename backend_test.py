import requests
import sys
import json
from datetime import datetime

class FightNetAPITester:
    def __init__(self, base_url="https://knockout-social.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.username = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, status, details=""):
        """Log test result"""
        result = {
            "test": name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{'✅' if status == 'PASS' else '❌'} {name} - {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log_test(name, "PASS", f"Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                self.log_test(name, "FAIL", f"Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, "ERROR", f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n=== HEALTH CHECKS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_register(self, username, email, password, first_name):
        """Test user registration"""
        print("\n=== USER REGISTRATION ===")
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "email": email,
                "password": password,
                "first_name": first_name,
                "fighter_type": "MMA",
                "gym": "Test Gym"
            }
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.username = response['user']['username']
            self.log_test("Token Generation", "PASS", "Token received")
            return True
        else:
            self.log_test("Token Generation", "FAIL", "No token in response")
            return False

    def test_login(self, email, password):
        """Test user login"""
        print("\n=== USER LOGIN ===")
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login", 
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.username = response['user']['username']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        print("\n=== AUTH VERIFICATION ===")
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_posts(self):
        """Test post operations"""
        print("\n=== POST OPERATIONS ===")
        
        # Create post with form data
        url = f"{self.base_url}/posts"
        headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}
        
        print(f"\n🔍 Testing Create Post...")
        self.tests_run += 1
        
        try:
            form_data = {'caption': 'Test training video from backend test'}
            response = requests.post(url, data=form_data, headers=headers)
            
            if response.status_code == 200:
                self.tests_passed += 1
                self.log_test("Create Post", "PASS", f"Status: {response.status_code}")
                response_data = response.json()
                success = True
            else:
                self.log_test("Create Post", "FAIL", f"Expected 200, got {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Post", "ERROR", f"Exception: {str(e)}")
            return False
        
        if not success:
            return False
            
        post_id = response_data.get('id')
        if not post_id:
            self.log_test("Post Creation", "FAIL", "No post ID in response")
            return False

        # Get all posts
        self.run_test("Get All Posts", "GET", "posts", 200)
        
        # Get specific post
        self.run_test("Get Single Post", "GET", f"posts/{post_id}", 200)
        
        # Get user posts
        self.run_test("Get User Posts", "GET", f"posts/user/{self.user_id}", 200)
        
        # Test glove (like)
        self.run_test("Toggle Glove", "POST", f"posts/{post_id}/glove", 200)
        
        # Test KO (super-like)
        self.run_test("Toggle KO", "POST", f"posts/{post_id}/ko", 200)
        
        # Delete post
        self.run_test("Delete Post", "DELETE", f"posts/{post_id}", 200)
        
        return True

    def test_comments(self):
        """Test comment operations"""
        print("\n=== COMMENT OPERATIONS ===")
        
        # First create a post to comment on with form data
        url = f"{self.base_url}/posts"
        headers = {'Authorization': f'Bearer {self.token}'} if self.token else {}
        
        print(f"\n🔍 Testing Create Post for Comments...")
        self.tests_run += 1
        
        try:
            form_data = {'caption': 'Test post for comments'}
            response = requests.post(url, data=form_data, headers=headers)
            
            if response.status_code == 200:
                self.tests_passed += 1
                self.log_test("Create Post for Comments", "PASS", f"Status: {response.status_code}")
                response_data = response.json()
                success = True
            else:
                self.log_test("Create Post for Comments", "FAIL", f"Expected 200, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Post for Comments", "ERROR", f"Exception: {str(e)}")
            return False
        
        if not success:
            return False
            
        post_id = response.get('id')
        
        # Create comment
        success, response = self.run_test(
            "Create Comment",
            "POST",
            f"posts/{post_id}/comments",
            200,
            data={"content": "Great training session!"}
        )
        
        if not success:
            return False
            
        comment_id = response.get('id')
        
        # Get comments
        self.run_test("Get Comments", "GET", f"posts/{post_id}/comments", 200)
        
        # Delete comment
        if comment_id:
            self.run_test("Delete Comment", "DELETE", f"comments/{comment_id}", 200)
        
        # Cleanup - delete test post
        self.run_test("Delete Test Post", "DELETE", f"posts/{post_id}", 200)
        
        return True

    def test_user_operations(self):
        """Test user profile and social operations"""
        print("\n=== USER OPERATIONS ===")
        
        # Get user profile
        self.run_test("Get User Profile", "GET", f"users/{self.user_id}", 200)
        
        # Update profile
        self.run_test(
            "Update Profile",
            "PUT",
            "users/profile",
            200,
            data={
                "bio": "Test fighter bio",
                "wins": 5,
                "losses": 2,
                "kos": 3
            }
        )
        
        # Search users
        self.run_test("Search Users", "GET", f"users/search/test", 200)
        
        return True

    def test_messaging(self):
        """Test messaging operations"""
        print("\n=== MESSAGING OPERATIONS ===")
        
        # Get conversations
        self.run_test("Get Conversations", "GET", "messages/conversations", 200)
        
        # Note: We can't easily test sending messages without another user
        # But we can test the endpoint structure
        return True

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🥊 Starting FightNet API Testing...")
        
        # Test health first
        self.test_health_check()
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_username = f"testfighter_{timestamp}"
        test_email = f"test_{timestamp}@fightnet.com"
        test_password = "TestFighter123!"
        test_name = f"Test Fighter {timestamp}"

        # Test registration
        if not self.test_register(test_username, test_email, test_password, test_name):
            print("❌ Registration failed, stopping tests")
            return False

        # Test authentication
        if not self.test_auth_me():
            print("❌ Auth verification failed")
            return False

        # Test main features
        self.test_posts()
        self.test_comments()
        self.test_user_operations()
        self.test_messaging()

        # Print results
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        # Save test results
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': f'{self.tests_passed}/{self.tests_run} tests passed',
                'results': self.test_results,
                'success_rate': f"{(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0%"
            }, f, indent=2)

        return self.tests_passed == self.tests_run

def main():
    tester = FightNetAPITester()
    success = tester.run_full_test_suite()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())