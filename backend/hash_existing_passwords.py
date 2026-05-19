"""
hash_existing_passwords.py — Script per fer el hash de les passwords existents

Les dades de prova de la BD (jherrero, independencia, urnes) estan en text pla.
bcrypt NO pot verificar text pla, per tant cal fer el hash d'aquestes passwords
ABANS d'arrancar el backend per primera vegada.

Executa'l UNA SOLA VEGADA:
  python hash_existing_passwords.py
"""
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
import models
from security import hash_password

def main():
    db = SessionLocal()
    try:
        users = db.query(models.Usuari).all()
        updated = 0
        for user in users:
            # Detectem si la password JA és un hash bcrypt (comencen per $2b$)
            if not user.Password.startswith("$2b$"):
                plain = user.Password
                user.Password = hash_password(plain)
                print(f"  ✓ Hash fet per: {user.Usuari} (password antiga: {plain})")
                updated += 1
            else:
                print(f"  · Ja té hash: {user.Usuari}")

        if updated > 0:
            db.commit()
            print(f"\n✅ {updated} password(s) actualitzada(s) correctament.")
        else:
            print("\nℹ️  Totes les passwords ja tenien hash. Res a fer.")

    finally:
        db.close()

if __name__ == "__main__":
    main()
