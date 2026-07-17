import os
import sys
import subprocess
import time
import webbrowser
import urllib.request
import urllib.error
import glob

# ANSI colors for premium console formatting
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
RESET = "\033[0m"

# Enable ANSI colors on Windows console
os.system("")

def is_server_running(url="http://127.0.0.1:8000/"):
    try:
        # Send a quick request to check if server is responsive
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=1.0) as response:
            return response.status == 200
    except (urllib.error.URLError, ConnectionResetError, ConnectionRefusedError):
        return False

def main():
    print(f"{CYAN}=================================================={RESET}")
    print(f"{CYAN}               CodeMind Launcher                  {RESET}")
    print(f"{CYAN}=================================================={RESET}")
    
    server_url = "http://127.0.0.1:8000/"
    
    # 1. Check if server is already running
    if is_server_running(server_url):
        print(f"{YELLOW}[!] CodeMind is already running. Opening browser...{RESET}")
        webbrowser.open(server_url)
        return

    # 2. Get main.py / main.pyd path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(current_dir, "main.py")
    
    # Check for compiled files like main.pyd or main.cp311-win_amd64.pyd
    compiled_matches = glob.glob(os.path.join(current_dir, "main*.pyd"))
    is_compiled = False
    for filepath in compiled_matches:
        filename = os.path.basename(filepath)
        if filename == "main.pyd" or (filename.startswith("main.") and filename.endswith(".pyd")):
            is_compiled = True
            break
    
    if not os.path.exists(main_script) and not is_compiled:
        print(f"{RED}[Error] Could not find main.py or main.pyd at {current_dir}{RESET}")
        input("\nPress any key to exit...")
        sys.exit(1)
        
    print(f"{GREEN}[*] Starting CodeMind server...{RESET}")
    
    # Start the server subprocess using the current python executable
    process = None
    try:
        if is_compiled:
            # For compiled .pyd files, run python -c to import and execute the server startup logic.
            # We disable reload in uvicorn since compiled binaries do not support hot reloading.
            startup_command = (
                "import setup_ollama; "
                "import database as db; "
                "import uvicorn; "
                "setup_ollama.run_setup(); "
                "db.db_init(); "
                "uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=False)"
            )
            process = subprocess.Popen(
                [sys.executable, "-c", startup_command],
                cwd=current_dir
            )
        else:
            # For standard source files, execute main.py directly
            process = subprocess.Popen(
                [sys.executable, main_script],
                cwd=current_dir
            )
        
        # 3. Poll until server is ready
        print(f"{GREEN}[*] Waiting for server to start at {server_url}", end="", flush=True)
        server_ready = False
        for _ in range(30):  # Wait up to 30 seconds
            if process.poll() is not None:
                # Subprocess exited unexpectedly
                print(f"\n{RED}[Error] main.py exited prematurely with code {process.returncode}{RESET}")
                input("\nPress any key to exit...")
                sys.exit(1)
            
            if is_server_running(server_url):
                server_ready = True
                break
                
            print(".", end="", flush=True)
            time.sleep(1)
            
        if server_ready:
            print(f"\n{GREEN}[+] CodeMind server is online!{RESET}")
            print(f"{GREEN}[+] Launching web interface in your default browser...{RESET}")
            webbrowser.open(server_url)
            
            # Keep launcher running and forward signals until server is closed
            try:
                # Wait for the subprocess to end
                process.wait()
            except KeyboardInterrupt:
                print(f"\n{YELLOW}[*] Shutting down CodeMind server...{RESET}")
                process.terminate()
                process.wait()
                print(f"{GREEN}[+] Shutdown complete.{RESET}")
        else:
            print(f"\n{RED}[Error] Server failed to start within 30 seconds.{RESET}")
            if process:
                process.terminate()
            input("\nPress any key to exit...")
            sys.exit(1)
                
    except Exception as e:
        print(f"\n{RED}[Error] Failed to launch backend: {e}{RESET}")
        if process:
            try:
                process.terminate()
            except Exception:
                pass
        input("\nPress any key to exit...")
        sys.exit(1)
            
if __name__ == "__main__":
    main()
