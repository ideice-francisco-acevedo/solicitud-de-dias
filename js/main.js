(function () {
    'use strict';

    const formSolicitud = document.getElementById('formSolicitud');
    const cedulaInput = document.getElementById('cedula');
    const btnBuscar = document.getElementById('btnBuscar');
    const btnEnviar = document.getElementById('btnEnviar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const spinner = document.getElementById('spinner');
    const mensajeResultado = document.getElementById('mensajeResultado');
    const infoCumpleanos = document.getElementById('infoCumpleanos');
    const mensajeCumpleanos = document.getElementById('mensajeCumpleanos');
    const diaSolicitadoInput = document.getElementById('diaSolicitado');
    const tipoDiaRadios = document.querySelectorAll('input[name="tipo_dia"]');

    const API_BASE = 'api/';

    let empleadoEncontrado = false;
    let fechaNacimientoEmpleado = null;
    let empleadoId = 0;
    let supervisorId = 0;
    let supervisorNombre = '';
    let rrhhId = 0;
    let rrhhNombre = '';

    function normalizarCedula(valor) {
        var soloDigitos = valor.replace(/\D/g, '');
        if (soloDigitos.length === 11) {
            soloDigitos = soloDigitos.substring(0, 3) + '-' + soloDigitos.substring(3, 10) + '-' + soloDigitos.substring(10, 11);
        }
        return soloDigitos;
    }

    function mostrarSpinner() {
        spinner.classList.remove('hidden');
    }

    function ocultarSpinner() {
        spinner.classList.add('hidden');
    }

    function mostrarMensaje(mensaje, tipo) {
        mensajeResultado.textContent = mensaje;
        mensajeResultado.className = 'result-message ' + tipo;
        mensajeResultado.classList.remove('hidden');
    }

    function ocultarMensaje() {
        mensajeResultado.classList.add('hidden');
    }

    function mostrarErrorCampo(elemento, mensaje) {
        elemento.textContent = mensaje;
    }

    function limpiarErrores() {
        document.querySelectorAll('.field-error').forEach(function (el) {
            el.textContent = '';
        });
        ocultarMensaje();
    }

    function limpiarDatosEmpleado() {
        document.getElementById('apellidos').value = '';
        document.getElementById('nombres').value = '';
        document.getElementById('puesto').value = '';
        document.getElementById('areaTrabajo').value = '';
        empleadoEncontrado = false;
        fechaNacimientoEmpleado = null;
        empleadoId = 0;
        supervisorId = 0;
        supervisorNombre = '';
        rrhhId = 0;
        rrhhNombre = '';
        document.getElementById('nombreEmpleadoFirma').textContent = '';
        document.getElementById('nombreSupervisorFirma').textContent = '';
        document.getElementById('nombreRrhhFirma').textContent = '';
        ocultarInfoCumpleanos();
    }

    function ocultarInfoCumpleanos() {
        infoCumpleanos.classList.add('hidden');
        infoCumpleanos.className = 'info-box hidden';
    }

    function mostrarInfoCumpleanos(mensaje, esValido) {
        infoCumpleanos.classList.remove('hidden');
        infoCumpleanos.className = 'info-box ' + (esValido ? 'valid' : 'invalid');
        mensajeCumpleanos.textContent = mensaje;
    }

    function toggleBotonEnviar(habilitado) {
        btnEnviar.disabled = !habilitado;
    }

    function validarFormulario() {
        limpiarErrores();

        if (!empleadoEncontrado) {
            mostrarErrorCampo(document.getElementById('errorCedula'), 'Debe buscar un empleado por cédula.');
            return false;
        }

        const tipoDiaSeleccionado = document.querySelector('input[name="tipo_dia"]:checked');
        if (!tipoDiaSeleccionado) {
            mostrarErrorCampo(document.getElementById('errorTipoDia'), 'Debe seleccionar un tipo de día.');
            return false;
        }

        if (!diaSolicitadoInput.value) {
            mostrarErrorCampo(document.getElementById('errorDiaSolicitado'), 'Debe seleccionar el día solicitado.');
            return false;
        }

        return true;
    }

    async function buscarEmpleado() {
        var cedulaRaw = cedulaInput.value.trim();

        if (!cedulaRaw) {
            mostrarErrorCampo(document.getElementById('errorCedula'), 'Debe ingresar una cédula.');
            return;
        }

        var cedula = normalizarCedula(cedulaRaw);
        cedulaInput.value = cedula;

        limpiarDatosEmpleado();
        limpiarErrores();
        mostrarSpinner();

        try {
            const response = await fetch(API_BASE + 'buscar_empleado.php?cedula=' + encodeURIComponent(cedula));

            if (!response.ok) {
                const errorData = await response.json().catch(function () { return null; });
                throw new Error(errorData && errorData.error ? errorData.error : 'Empleado no encontrado.');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error('Error al obtener datos del empleado.');
            }

            const emp = data.empleado;

            document.getElementById('apellidos').value = emp.apellidos || '';
            document.getElementById('nombres').value = emp.nombres || '';
            document.getElementById('puesto').value = emp.puesto || '';
            document.getElementById('areaTrabajo').value = emp.area_trabajo || '';

            empleadoEncontrado = true;
            empleadoId = emp.id || 0;
            fechaNacimientoEmpleado = emp.fecha_nacimiento || null;

            supervisorId = emp.supervisor_id || 0;
            supervisorNombre = emp.supervisor_nombre || 'No asignado';
            rrhhId = emp.rrhh_id || 0;
            rrhhNombre = emp.rrhh_nombre || 'No asignado';

            document.getElementById('nombreEmpleadoFirma').textContent = emp.nombres + ' ' + emp.apellidos;
            document.getElementById('nombreSupervisorFirma').textContent = supervisorNombre;
            document.getElementById('nombreRrhhFirma').textContent = rrhhNombre;

            mostrarErrorCampo(document.getElementById('errorCedula'), 'Empleado encontrado correctamente.');
            document.getElementById('errorCedula').style.color = '#27ae60';

            verificarCumpleanosSiAplica();
        } catch (error) {
            mostrarErrorCampo(document.getElementById('errorCedula'), error.message);
            toggleBotonEnviar(false);
        } finally {
            ocultarSpinner();
        }
    }

    async function verificarCumpleanos() {
        const tipoDiaSeleccionado = document.querySelector('input[name="tipo_dia"]:checked');

        if (!tipoDiaSeleccionado || tipoDiaSeleccionado.value !== '2') {
            ocultarInfoCumpleanos();
            return;
        }

        if (!empleadoEncontrado || !fechaNacimientoEmpleado) {
            ocultarInfoCumpleanos();
            return;
        }

        const diaSolicitado = diaSolicitadoInput.value;
        if (!diaSolicitado) {
            ocultarInfoCumpleanos();
            return;
        }

        const cedula = cedulaInput.value.trim();

        mostrarSpinner();

        try {
            const url = API_BASE + 'verificar_cumpleanos.php?cedula=' + encodeURIComponent(cedula)
                + '&dia_solicitado=' + encodeURIComponent(diaSolicitado);

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json().catch(function () { return null; });
                throw new Error(errorData && errorData.error ? errorData.error : 'Error al verificar cumpleaños.');
            }

            const data = await response.json();

            mostrarInfoCumpleanos(data.mensaje, data.valido);
            toggleBotonEnviar(data.valido);
        } catch (error) {
            mostrarInfoCumpleanos(error.message, false);
            toggleBotonEnviar(false);
        } finally {
            ocultarSpinner();
        }
    }

    function verificarCumpleanosSiAplica() {
        var tipoDiaSeleccionado = document.querySelector('input[name="tipo_dia"]:checked');
        if (tipoDiaSeleccionado && tipoDiaSeleccionado.value === '2') {
            verificarCumpleanos();
        }
    }

    async function enviarSolicitud(evento) {
        evento.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        const tipoDiaSeleccionado = document.querySelector('input[name="tipo_dia"]:checked');
        if (tipoDiaSeleccionado.value === '2') {
            var infoBox = infoCumpleanos;
            if (infoBox.classList.contains('invalid') || infoBox.classList.contains('hidden')) {
                mostrarErrorCampo(document.getElementById('errorDiaSolicitado'),
                    'El día de cumpleaños no es válido. Verifique antes de enviar.');
                return;
            }
        }

        const formData = {
            fecha_solicitud: document.getElementById('fechaSolicitud').value,
            empleado_id: empleadoId,
            creado_por_id: empleadoId,
            rrhh_id: rrhhId,
            dia_solicitado: diaSolicitadoInput.value,
            tipo_dia_id: parseInt(tipoDiaSeleccionado.value, 10),
            observaciones: document.getElementById('observaciones').value.trim()
        };

        mostrarSpinner();

        try {
            const response = await fetch(API_BASE + 'enviar_solicitud.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(function () { return null; });
                throw new Error(errorData && errorData.error ? errorData.error : 'Error al enviar la solicitud.');
            }

            const data = await response.json();

            mostrarMensaje(data.message + ' (ID: ' + data.solicitud_id + ')', 'success');
            document.getElementById('errorCedula').style.color = '#e74c3c';
        } catch (error) {
            mostrarMensaje(error.message, 'error');
        } finally {
            ocultarSpinner();
        }
    }

    function limpiarFormulario() {
        formSolicitud.reset();
        limpiarDatosEmpleado();
        limpiarErrores();
        document.getElementById('errorCedula').style.color = '#e74c3c';
        toggleBotonEnviar(true);
    }

    btnBuscar.addEventListener('click', buscarEmpleado);

    cedulaInput.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            buscarEmpleado();
        }
    });

    tipoDiaRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            ocultarMensaje();
            if (radio.value === '2') {
                verificarCumpleanosSiAplica();
            } else if (radio.value === '1') {
                ocultarInfoCumpleanos();
                toggleBotonEnviar(empleadoEncontrado);
            }
        });
    });

    diaSolicitadoInput.addEventListener('change', function () {
        ocultarMensaje();
        verificarCumpleanosSiAplica();
    });

    document.getElementById('fechaSolicitud').addEventListener('change', function () {
        ocultarMensaje();
    });

    cedulaInput.addEventListener('input', function () {
        if (empleadoEncontrado) {
            limpiarDatosEmpleado();
            document.getElementById('errorCedula').style.color = '#e74c3c';
            document.getElementById('errorCedula').textContent = '';
        }
    });

    formSolicitud.addEventListener('submit', enviarSolicitud);

    document.getElementById('chkObservaciones').addEventListener('change', function () {
        var fila = document.getElementById('filaObservaciones');
        if (this.checked) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
            document.getElementById('observaciones').value = '';
        }
    });

    btnLimpiar.addEventListener('click', limpiarFormulario);

    toggleBotonEnviar(false);

    var hoy = new Date();
    var fechaHoy = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');
    document.getElementById('fechaSolicitud').value = fechaHoy;
})();
