import os
import sqlite3

db_file = "showup.db"


def init_db():
    conn = sqlite3.connect("showup.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY, name TEXT, description TEXT, sports TEXT, skill_level TEXT, available INTEGER DEFAULT 0)''')
    
    conn.commit()
    conn.close()
    
def get_connection():
    return sqlite3.connect("showup.db")