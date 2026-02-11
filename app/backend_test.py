import requests
import sys
import json
from datetime import datetime, timedelta

class FinanceTrackerAPITester:
    def __init__(self, base_url="https://daily-profit-tracker-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, error_msg=None):
        """Log a test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {error_msg}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "error": error_msg
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.log_test(name, True)
                try:
                    return response.json()
                except:
                    return {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', 'No details')
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text}"
                self.log_test(name, False, error_msg)
                return None

        except Exception as e:
            self.log_test(name, False, str(e))
            return None

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test registration
        test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        test_password = "TestPass123!"
        test_name = "Test User"
        
        register_data = {
            "email": test_email,
            "password": test_password,
            "name": test_name
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not response:
            return False
            
        # Test login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token acquired: {self.token[:20]}...")
            return True
        return False

    def test_me_endpoint(self):
        """Test current user endpoint"""
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me", 
            200
        )
        return response is not None

    def test_revenue_crud(self):
        """Test complete Revenue CRUD operations"""
        print("\n=== TESTING REVENUE CRUD ===")
        
        # Test create revenue
        today = datetime.now().strftime('%Y-%m-%d')
        revenue_data = {
            "date": today,
            "cash_amount": 500.0,
            "contributions": [
                {"name": "Person1", "amount": 100.0},
                {"name": "Person2", "amount": 150.0}
            ]
        }
        
        response = self.run_test(
            "Create Revenue Entry",
            "POST",
            "revenue",
            200,
            data=revenue_data
        )
        
        if not response:
            return False
            
        revenue_id = response.get('id')
        total_revenue = response.get('total_revenue')
        
        # Verify auto-calculation
        expected_total = 500.0 + 100.0 + 150.0
        if total_revenue == expected_total:
            self.log_test("Revenue Auto-calculation", True)
        else:
            self.log_test("Revenue Auto-calculation", False, f"Expected {expected_total}, got {total_revenue}")
        
        # Test duplicate date (should fail)
        duplicate_response = self.run_test(
            "Create Duplicate Date Revenue (Should Fail)",
            "POST",
            "revenue",
            400,
            data=revenue_data
        )
        
        # Test get all revenues
        self.run_test(
            "Get All Revenues",
            "GET",
            "revenue",
            200
        )
        
        # Test update revenue
        updated_data = {
            "date": today,
            "cash_amount": 600.0,
            "contributions": [
                {"name": "Person1", "amount": 200.0}
            ]
        }
        
        self.run_test(
            "Update Revenue Entry",
            "PUT",
            f"revenue/{revenue_id}",
            200,
            data=updated_data
        )
        
        # Test delete revenue
        self.run_test(
            "Delete Revenue Entry", 
            "DELETE",
            f"revenue/{revenue_id}",
            200
        )
        
        return True

    def test_expense_crud(self):
        """Test complete Expense CRUD operations"""
        print("\n=== TESTING EXPENSE CRUD ===")
        
        # Test create expense
        today = datetime.now().strftime('%Y-%m-%d')
        expense_data = {
            "date": today,
            "category": "Vegetables",
            "description": "Daily vegetables purchase",
            "amount": 200.0,
            "remarks": "Fresh vegetables from market"
        }
        
        response = self.run_test(
            "Create Expense Entry",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        
        if not response:
            return False
            
        expense_id = response.get('id')
        
        # Test get all expenses
        self.run_test(
            "Get All Expenses",
            "GET", 
            "expenses",
            200
        )
        
        # Test category filter
        self.run_test(
            "Get Expenses by Category",
            "GET",
            "expenses",
            200,
            params={"category": "Vegetables"}
        )
        
        # Test update expense
        updated_expense = {
            "date": today,
            "category": "Groceries", 
            "description": "Updated grocery purchase",
            "amount": 250.0,
            "remarks": "Updated remarks"
        }
        
        self.run_test(
            "Update Expense Entry",
            "PUT",
            f"expenses/{expense_id}",
            200,
            data=updated_expense
        )
        
        # Test delete expense
        self.run_test(
            "Delete Expense Entry",
            "DELETE", 
            f"expenses/{expense_id}",
            200
        )
        
        return True

    def test_reports(self):
        """Test reports functionality"""
        print("\n=== TESTING REPORTS ===")
        
        # First create some test data
        today = datetime.now().strftime('%Y-%m-%d')
        current_month = datetime.now().strftime('%Y-%m')
        
        # Create test revenue
        revenue_data = {
            "date": today,
            "cash_amount": 1000.0,
            "contributions": []
        }
        
        rev_response = self.run_test(
            "Create Test Revenue for Reports",
            "POST",
            "revenue", 
            200,
            data=revenue_data
        )
        
        # Create test expense
        expense_data = {
            "date": today,
            "category": "Utilities",
            "description": "Electricity bill",
            "amount": 300.0,
            "remarks": ""
        }
        
        exp_response = self.run_test(
            "Create Test Expense for Reports",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        
        # Test daily reports
        self.run_test(
            "Get Daily Reports",
            "GET",
            "reports/daily",
            200,
            params={"month": current_month}
        )
        
        # Test monthly summary
        response = self.run_test(
            "Get Monthly Summary",
            "GET",
            "reports/monthly-summary", 
            200,
            params={"month": current_month}
        )
        
        if response:
            # Verify P&L calculation
            total_rev = response.get('total_revenue', 0)
            total_exp = response.get('total_expenses', 0) 
            net_profit = response.get('net_profit', 0)
            expected_profit = total_rev - total_exp
            
            if net_profit == expected_profit:
                self.log_test("Monthly P&L Calculation", True)
            else:
                self.log_test("Monthly P&L Calculation", False, f"Expected {expected_profit}, got {net_profit}")
        
        # Cleanup test data
        if rev_response:
            requests.delete(f"{self.base_url}/revenue/{rev_response.get('id')}", 
                          headers={'Authorization': f'Bearer {self.token}'})
        if exp_response:
            requests.delete(f"{self.base_url}/expenses/{exp_response.get('id')}", 
                          headers={'Authorization': f'Bearer {self.token}'})
        
        return True

    def test_exports(self):
        """Test CSV export functionality"""
        print("\n=== TESTING EXPORTS ===")
        
        current_month = datetime.now().strftime('%Y-%m')
        
        # Test revenue export
        try:
            response = requests.get(
                f"{self.base_url}/revenue/export",
                headers={'Authorization': f'Bearer {self.token}'},
                params={"month": current_month}
            )
            if response.status_code == 200 and 'text/csv' in response.headers.get('content-type', ''):
                self.log_test("Revenue CSV Export", True)
            else:
                self.log_test("Revenue CSV Export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Revenue CSV Export", False, str(e))
        
        # Test expense export
        try:
            response = requests.get(
                f"{self.base_url}/expenses/export",
                headers={'Authorization': f'Bearer {self.token}'},
                params={"month": current_month}
            )
            if response.status_code == 200 and 'text/csv' in response.headers.get('content-type', ''):
                self.log_test("Expense CSV Export", True)
            else:
                self.log_test("Expense CSV Export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Expense CSV Export", False, str(e))

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Comprehensive API Testing...")
        print(f"Backend URL: {self.base_url}")
        
        # Test authentication first
        if not self.test_auth_flow():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test protected endpoints
        if not self.test_me_endpoint():
            print("❌ User endpoint failed")
        
        # Test CRUD operations 
        self.test_revenue_crud()
        self.test_expense_crud()
        
        # Test reports
        self.test_reports()
        
        # Test exports
        self.test_exports()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FinanceTrackerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())