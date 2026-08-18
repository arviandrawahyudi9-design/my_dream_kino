import sys
import time
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

print("🚀 Telegram Kino Bot va Web Admin Paneli ishga tushmoqda...")

# 1. Web Admin Panel serverini ishga tushirish
web_process = subprocess.Popen([sys.executable, "web_app.py"])
print("🌐 Web Admin Paneli: http://localhost:5000")

# 2. Telegram Bot jarayonini ishga tushirish
bot_process = subprocess.Popen([sys.executable, "bot.py"])
print("🤖 Telegram Bot ishga tushdi!")

try:
    web_process.wait()
    bot_process.wait()
except KeyboardInterrupt:
    print("\n🛑 Barcha jarayonlar to'xtatildi.")
    web_process.terminate()
    bot_process.terminate()
