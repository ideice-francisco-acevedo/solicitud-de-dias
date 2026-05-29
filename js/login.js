(function () {
    'use strict';

    const formLogin = document.getElementById('formLogin');
    const btnLogin = document.getElementById('btnLogin');
    const loginError = document.getElementById('loginError');
    const cedulaInput = document.getElementById('cedulaLogin');

    function normalizarCedula(valor) {
        var soloDigitos = valor.replace(/\D/g, '');
        if (soloDigitos.length === 11) {
            soloDigitos = soloDigitos.substring(0, 3) + '-' + soloDigitos.substring(3, 10) + '-' + soloDigitos.substring(10, 11);
        }
        return soloDigitos;
    }

    function mostrarError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }

    function ocultarError() {
        loginError.classList.add('hidden');
    }

    async function login() {
        ocultarError();
        var cedula = normalizarCedula(cedulaInput.value.trim());
        var password = document.getElementById('passwordLogin').value;

        if (!cedula || !password) {
            mostrarError('Complete todos los campos');
            return;
        }

        cedulaInput.value = cedula;
        btnLogin.disabled = true;
        btnLogin.textContent = 'Ingresando...';

        try {
            var resp = await fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula: cedula, password: password })
            });

            var data = await resp.json();

            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                mostrarError(data.error || 'Error al iniciar sesión');
            }
        } catch (e) {
            mostrarError('Error de conexión');
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar Sesión';
        }
    }

    async function verificarSesion() {
        try {
            var resp = await fetch('api/verificar_sesion.php');
            var data = await resp.json();
            if (data.logueado) {
                window.location.href = 'dashboard.html';
            }
        } catch (e) {}
    }

    formLogin.addEventListener('submit', login);
    cedulaInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); login(); }
    });
    document.getElementById('passwordLogin').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); login(); }
    });

    verificarSesion();
})();
