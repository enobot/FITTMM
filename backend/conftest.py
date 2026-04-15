import sys
import os

# Add the backend/ folder to the Python path so imports like
# "from core.database import ..." work correctly during tests
sys.path.insert(0, os.path.dirname(__file__))
