import sqlite3

def check_db():
    try:
        conn = sqlite3.connect('team_intuition.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            t_name = table[0]
            print(f"\nContent of {t_name}:")
            cursor.execute(f"SELECT * FROM {t_name}")
            rows = cursor.fetchall()
            for row in rows:
                print(row)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
