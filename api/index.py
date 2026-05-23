from flask import Flask, request
import lief

app = Flask(__name__)

@app.route('/api/process', methods=['POST'])
def process():
    if 'file' not in request.files:
        return "No file uploaded", 400

    file = request.files['file']
    file_path = f"/tmp/{file.filename}"
    file.save(file_path)

    try:
        binary = lief.parse(file_path)
        symbols = [s.name for s in binary.exported_symbols if s.name.startswith("il2cpp_")]
        output = "Il2Cpp.$config.exports = {\n"
        for s in symbols:
            output += f'    {s}: () => Il2Cpp.module.findExportByName("{s}"),\n'
        output += "};"
        return output, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return str(e), 500

app_handler = app
