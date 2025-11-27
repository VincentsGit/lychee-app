from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow all origins

@app.route("/api/hello")
def hello():
    return jsonify(message="Hello from Flask on Raspberry Pi!")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # debug enables hot reload
