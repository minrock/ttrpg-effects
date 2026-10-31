"""Arnés de prueba: controla PTY real; solo imprime estado y nunca entrada/salida privada."""
import json
import os
import pty
import select
import subprocess
import sys
import time
import termios

payload = json.load(sys.stdin)
environment = os.environ.copy()
environment.update(payload["env"])

def run(operation, answers, expected=0):
    master, slave = pty.openpty()
    terminal_flags = termios.tcgetattr(master)[3] & (termios.ECHO | termios.ICANON)
    child = subprocess.Popen(["pnpm", "identity:" + operation], stdin=slave, stdout=slave, stderr=slave, env=environment, close_fds=True)
    os.close(slave)
    output = b""
    cursor = 0
    def read_until(marker):
        nonlocal output, cursor
        deadline = time.monotonic() + 15
        while marker.encode() not in output[cursor:]:
            if time.monotonic() > deadline:
                raise RuntimeError("Tiempo de espera del prompt excedido")
            ready, _, _ = select.select([master], [], [], 0.1)
            if ready:
                try:
                    chunk = os.read(master, 65536)
                except OSError:
                    raise RuntimeError("El proceso terminó antes del prompt") from None
                if not chunk:
                    raise RuntimeError("EOF antes del prompt")
                output += chunk
        cursor = len(output)
    try:
        for marker, value in answers:
            read_until(marker)
            os.write(master, value.encode())
        deadline = time.monotonic() + 15
        while child.poll() is None:
            if time.monotonic() > deadline:
                raise RuntimeError("Tiempo de espera de finalización excedido")
            ready, _, _ = select.select([master], [], [], 0.1)
            if ready:
                try:
                    output += os.read(master, 65536)
                except OSError:
                    break
        result = child.wait(timeout=5)
        if termios.tcgetattr(master)[3] & (termios.ECHO | termios.ICANON) != terminal_flags:
            raise RuntimeError("La terminal no recuperó eco/modo canónico")
        for private in payload["secrets"]:
            if private.encode() in output:
                raise RuntimeError("La terminal reveló una contraseña de prueba")
        if result != expected:
            raise RuntimeError("Código de salida inesperado en " + operation)
    finally:
        if child.poll() is None:
            child.terminate()
            child.wait(timeout=5)
        os.close(master)

try:
    for operation in payload["operations"]:
        run(operation["name"], operation["answers"], operation.get("expected", 0))
    print("TTY_NO_ECHO_CLI_OK")
except Exception as error:
    # Los mensajes propios no contienen output, argv privados ni valores de respuestas.
    print(type(error).__name__ + ": " + str(error), file=sys.stderr)
    sys.exit(1)
