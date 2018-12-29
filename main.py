from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException


'''
This will check if you are logged in to WhatsApp Web 
It is coded as a custom wait condition in Selenium (https://selenium-python.readthedocs.io/waits.html#eplicit-waits) 
Checks the number of <span> elements are on the page (there is probably a better way to this in the future)
'''
class check_logged_in(object):
	def __init__(self, locator, count):
		self.locator = locator
		self.count = count
	def __call__(self, driver):
		spans = driver.find_elements(*self.locator) 
		if (len(spans) > self.count): 
			return True
		else:
			return False

def start():
	logged_in = False
	#Running Chrome with the --no-sandbox parameter seems 		
	#to be the the simplest way to run it in Docker.
	chrome_options = webdriver.ChromeOptions()
	chrome_options.add_argument('--load-extension=./wabot_extension')
	chrome_options.add_argument('--user-data-dir=./profile')

	'''
	Seems to be the most reliable way to run Chrome inside of Docker at the moment,
	I don't like having the --no-sandbox argument
	'''

	chrome_options.add_argument('--no-sandbox')

	print("[*] Starting")
	driver = webdriver.Chrome(options=chrome_options)

	print("[*] Navigating to WhatsApp Web")
	driver.get("https://web.whatsapp.com")

	# Check logged in, stay in while loop until logged in
	print("[*] Checking if logged in")
	wait = WebDriverWait(driver, 10)
	while not logged_in:
		try:
			status = wait.until(check_logged_in((By.TAG_NAME, "span"), 20))
			logged_in = True
			print("[*] Logged in...")
		except TimeoutException:
			print("[*] Not Logged in.. retrying in 10 seconds")

	print("[*] Logged in successfully")
	# Call get_store and init functions manually using execute_script()
	print("[*] Calling init() and get_store()")
	driver.execute_script("get_store()")
	driver.execute_script("init()")

	'''
	Need to be able to detect if both WhatsApp Web OR the chrome extension crashes
	The background page for the extension is opened in a tab so that it is added
	to driver.window_handles
	After this window_handles will include:
	[
		WhatsApp Web,
		Chrome Extension Page
	]
	'''
	print("[*] Opening extension page to monitor for crashes")
	extension_id = driver.execute_script("return extensionID")
	driver.execute_script("window.open()")
	driver.switch_to.window(driver.window_handles[1])
	driver.get("chrome-extension://" + extension_id + "/_generated_background_page.html")
	driver.switch_to.window(driver.window_handles[0])
	return driver

if __name__ == "__main__":
	driver = start()
	'''
	Endless loop to constantly check number of window_handles, since we
	expect 2 handles (WhatsApp Web and the Chrome Extension background page)
	Whenever the number of window_handles is less than 2 it means either WhatsApp Web
	or the chrome extension crashed 
	Still picking up Selenium so there may be a better way to do this, I tried 
	catching WebDriverExceptions but that only seemed to work on the page that the 
	driver is active on (so either WhatsApp Web or the extension) and not the others
	'''
	while True:
		if (len(driver.window_handles) > 1):
			pass
		else:
			print("[*] Chrome crashed... Restarting")
			# Restart 
			driver.quit()
			driver = start()
