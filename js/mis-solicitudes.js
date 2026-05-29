(function () {
    'use strict';

    const API_BASE = 'api/';
    const spinner = document.getElementById('spinner');
    const btnConsultar = document.getElementById('btnConsultar');
    const cedulaInput = document.getElementById('cedulaFiltro');
    const tablaContainer = document.getElementById('tablaContainer');
    const tablaBody = document.getElementById('tablaSolicitudes');
    const sinResultados = document.getElementById('sinResultados');
    const badge = document.getElementById('badgeNotificaciones');
    const badgeDetalle = document.getElementById('badgeNotifDetalle');
    const listaNotif = document.getElementById('listaNotificaciones');
    const modalEditar = document.getElementById('modalEditar');
    const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');

    let empleadoIdActual = 0;

    function normalizarCedula(valor) {
        var soloDigitos = valor.replace(/\D/g, '');
        if (soloDigitos.length === 11) {
            soloDigitos = soloDigitos.substring(0, 3) + '-' + soloDigitos.substring(3, 10) + '-' + soloDigitos.substring(10, 11);
        }
        return soloDigitos;
    }

    function mostrarSpinner() { spinner.classList.remove('hidden'); }
    function ocultarSpinner() { spinner.classList.add('hidden'); }

    function estadoClase(estadoId) {
        if (estadoId === 1) return 'estado-pendiente';
        if (estadoId === 2) return 'estado-aprobado';
        return 'estado-rechazado';
    }

    function abrirModal(s) {
        document.getElementById('editSolicitudId').value = s.id;
        document.getElementById('editFechaSolicitud').value = s.fecha_solicitud;
        document.getElementById('editObservaciones').value = s.observaciones || '';
        modalEditar.classList.remove('hidden');
    }

    function cerrarModal() {
        modalEditar.classList.add('hidden');
    }

    async function guardarEdicion() {
        var data = {
            solicitud_id: parseInt(document.getElementById('editSolicitudId').value),
            empleado_id: empleadoIdActual,
            fecha_solicitud: document.getElementById('editFechaSolicitud').value,
            observaciones: document.getElementById('editObservaciones').value
        };

        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'actualizar_solicitud.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            var result = await resp.json();
            if (result.success) {
                cerrarModal();
                consultarSolicitudes();
            } else {
                alert(result.error || 'Error al guardar');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            ocultarSpinner();
        }
    }

    async function consultarSolicitudes() {
        var cedulaRaw = cedulaInput.value.trim();
        if (!cedulaRaw) return;

        var cedula = normalizarCedula(cedulaRaw);
        cedulaInput.value = cedula;
        mostrarSpinner();

        try {
            var resp = await fetch(API_BASE + 'listar_solicitudes.php?cedula=' + encodeURIComponent(cedula));
            var data = await resp.json();

            if (!data.success) throw new Error('Error al consultar');

            tablaBody.innerHTML = '';

            if (data.solicitudes.length === 0) {
                sinResultados.classList.remove('hidden');
                tablaContainer.classList.remove('hidden');
            } else {
                sinResultados.classList.add('hidden');
                tablaContainer.classList.remove('hidden');

                data.solicitudes.forEach(function (s) {
                    var tr = document.createElement('tr');
                    tr.setAttribute('data-solicitud', JSON.stringify(s));
                    var accionHTML = s.estado_id === 1
                        ? '<button class="btn btn-sm btn-editar" data-id="' + s.id + '">Editar</button>'
                        : '<span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span>';
                    var obsContent = s.observaciones || '-';
                    if (s.motivo_rechazo) {
                        obsContent += '<br><small class="motivo-rechazo">Rechazo: ' + s.motivo_rechazo + '</small>';
                    }
                    tr.innerHTML =
                        '<td data-label="ID">' + s.id + '</td>' +
                        '<td data-label="F.Solicitud">' + s.fecha_solicitud + '</td>' +
                        '<td data-label="Empleado">' + s.empleado_nombre + '</td>' +
                        '<td data-label="Día">' + s.dia_solicitado + '</td>' +
                        '<td data-label="Tipo">' + s.tipo_dia_nombre + '</td>' +
                        '<td data-label="Estado"><span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span></td>' +
                        '<td data-label="Obs.">' + obsContent + '</td>' +
                        '<td data-label="Acción">' + accionHTML + '</td>';
                    tablaBody.appendChild(tr);
                });

                empleadoIdActual = data.solicitudes[0].empleado_id;

                document.querySelectorAll('.btn-editar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var tr = this.closest('tr');
                        var s = JSON.parse(tr.getAttribute('data-solicitud'));
                        abrirModal(s);
                    });
                });

                cargarNotificaciones();
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            ocultarSpinner();
        }
    }

    async function cargarNotificaciones() {
        if (!empleadoIdActual) return;

        try {
            var respNoLeidas = await fetch(API_BASE + 'notificaciones_no_leidas.php?empleado_id=' + empleadoIdActual);
            var dataNL = await respNoLeidas.json();
            var noLeidas = dataNL.no_leidas || 0;

            if (noLeidas > 0) {
                badge.textContent = noLeidas;
                badge.classList.remove('hidden');
                badgeDetalle.textContent = noLeidas;
                badgeDetalle.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
                badgeDetalle.classList.add('hidden');
            }

            var respNotif = await fetch(API_BASE + 'notificaciones.php?empleado_id=' + empleadoIdActual);
            var dataN = await respNotif.json();

            listaNotif.innerHTML = '';

            if (dataN.notificaciones.length === 0) {
                var li = document.createElement('li');
                li.textContent = 'No hay notificaciones';
                li.className = 'notif-vacia';
                listaNotif.appendChild(li);
                return;
            }

            dataN.notificaciones.forEach(function (n) {
                var li = document.createElement('li');
                li.className = 'notif-item' + (n.leida ? '' : ' notif-no-leida');
                li.innerHTML =
                    '<span>' + n.mensaje + '</span>' +
                    '<small>' + n.created_at + '</small>';
                if (!n.leida) {
                    li.style.cursor = 'pointer';
                    li.addEventListener('click', function () {
                        marcarLeida(n.id);
                    });
                }
                listaNotif.appendChild(li);
            });
        } catch (e) {
            console.error(e);
        }
    }

    async function marcarLeida(id) {
        try {
            await fetch(API_BASE + 'marcar_notificacion_leida.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });
            cargarNotificaciones();
        } catch (e) {
            console.error(e);
        }
    }

    btnGuardarEdicion.addEventListener('click', guardarEdicion);
    btnCancelarEdicion.addEventListener('click', cerrarModal);
    btnConsultar.addEventListener('click', consultarSolicitudes);
    cedulaInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); consultarSolicitudes(); }
    });
})();
