(function () {
    'use strict';

    const API_BASE = 'api/';
    const spinner = document.getElementById('spinner');
    const btnCargar = document.getElementById('btnCargar');
    const buscarEmpleado = document.getElementById('buscarEmpleado');
    const listaEmpleados = document.getElementById('listaEmpleados');
    const empleadoSeleccionado = document.getElementById('empleadoSeleccionado');
    const tablaContainer = document.getElementById('tablaContainer');
    const tablaBody = document.getElementById('tablaSolicitudes');
    const sinResultados = document.getElementById('sinResultados');
    const badge = document.getElementById('badgeNotificaciones');
    const badgeDetalle = document.getElementById('badgeNotifDetalle');
    const listaNotif = document.getElementById('listaNotificaciones');
    const filtroRrhh = document.getElementById('filtroRrhh');
    const modalEditar = document.getElementById('modalEditar');
    const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');

    let rrhhId = 0;
    let todosEmpleados = [];

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
        document.getElementById('editDiaSolicitado').value = s.dia_solicitado;
        document.getElementById('editTipoDia').value = s.tipo_dia_id;
        document.getElementById('editEstado').value = s.estado_id;
        document.getElementById('editObservaciones').value = s.observaciones || '';
        modalEditar.classList.remove('hidden');
    }

    function cerrarModal() {
        modalEditar.classList.add('hidden');
    }

    async function guardarEdicion() {
        var data = {
            solicitud_id: parseInt(document.getElementById('editSolicitudId').value),
            empleado_id: rrhhId,
            fecha_solicitud: document.getElementById('editFechaSolicitud').value,
            dia_solicitado: document.getElementById('editDiaSolicitado').value,
            tipo_dia_id: parseInt(document.getElementById('editTipoDia').value),
            estado_id: parseInt(document.getElementById('editEstado').value),
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
                cargarSolicitudes();
            } else {
                alert(result.error || 'Error al guardar');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            ocultarSpinner();
        }
    }

    async function cargarEmpleados() {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'listar_empleados.php');
            var data = await resp.json();
            if (data.success) {
                todosEmpleados = data.empleados;
                listaEmpleados.innerHTML = '';
                todosEmpleados.forEach(function (emp) {
                    var opt = document.createElement('option');
                    opt.value = emp.nombre_completo + ' - ' + emp.cedula;
                    opt.setAttribute('data-id', emp.id);
                    listaEmpleados.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            ocultarSpinner();
        }
    }

    function seleccionarEmpleado() {
        var valor = buscarEmpleado.value.trim();
        if (!valor) {
            rrhhId = 0;
            empleadoSeleccionado.textContent = '';
            empleadoSeleccionado.className = 'empleado-info';
            return;
        }

        var opciones = listaEmpleados.querySelectorAll('option');
        var encontrado = null;
        opciones.forEach(function (opt) {
            if (opt.value === valor) {
                encontrado = opt;
            }
        });

        if (encontrado) {
            var id = parseInt(encontrado.getAttribute('data-id'));
            var emp = todosEmpleados.find(function (e) { return e.id === id; });
            if (emp) {
                rrhhId = emp.id;
                empleadoSeleccionado.textContent = 'Seleccionado: ' + emp.nombre_completo + ' - ' + emp.area_trabajo;
                empleadoSeleccionado.className = 'empleado-info empleado-valido';
                cargarSolicitudes();
            }
        }
    }

    async function cargarSolicitudes() {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'listar_solicitudes.php?todos=1');
            var data = await resp.json();

            if (!data.success) throw new Error('Error al cargar');

            tablaBody.innerHTML = '';

            if (data.solicitudes.length === 0) {
                sinResultados.classList.remove('hidden');
                tablaContainer.classList.remove('hidden');
            } else {
                sinResultados.classList.add('hidden');
                tablaContainer.classList.remove('hidden');

                data.solicitudes.forEach(function (s) {
                    var tr = document.createElement('tr');
                    var accionHTML = '';

                    if (s.estado_id === 1) {
                        accionHTML += '<button class="btn btn-sm btn-editar" data-id="' + s.id + '">Editar</button> ';
                        accionHTML +=
                            '<button class="btn btn-sm btn-aprobar" data-id="' + s.id + '" data-estado="2">Aprobar</button> ' +
                            '<button class="btn btn-sm btn-rechazar" data-id="' + s.id + '" data-estado="3">Rechazar</button>';
                    } else {
                        accionHTML += '<span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span>';
                    }

                    tr.setAttribute('data-solicitud', JSON.stringify(s));

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

                document.querySelectorAll('.btn-editar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var tr = this.closest('tr');
                        var s = JSON.parse(tr.getAttribute('data-solicitud'));
                        abrirModal(s);
                    });
                });

                document.querySelectorAll('.btn-aprobar, .btn-rechazar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        cambiarEstado(this.dataset.id, parseInt(this.dataset.estado));
                    });
                });
            }

            if (rrhhId > 0) cargarNotificaciones();
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            ocultarSpinner();
        }
    }

    async function cambiarEstado(solicitudId, estadoId) {
        var motivo = '';
        if (estadoId === 3) {
            motivo = prompt('Por favor, indique el motivo del rechazo:');
            if (motivo === null) return;
        } else {
            if (!confirm('¿Está seguro de aprobar esta solicitud?')) return;
        }
        mostrarSpinner();
        try {
            var body = { solicitud_id: solicitudId, estado_id: estadoId };
            if (estadoId === 3) {
                body.motivo_rechazo = motivo;
            }
            var resp = await fetch(API_BASE + 'cambiar_estado.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            var data = await resp.json();
            if (data.success) {
                cargarSolicitudes();
            } else {
                alert(data.error || 'Error');
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            ocultarSpinner();
        }
    }

    async function cargarNotificaciones() {
        if (!rrhhId) return;
        try {
            var respNL = await fetch(API_BASE + 'notificaciones_no_leidas.php?empleado_id=' + rrhhId);
            var dataNL = await respNL.json();
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

            var respNotif = await fetch(API_BASE + 'notificaciones.php?empleado_id=' + rrhhId);
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
                    '<span>Solicitud #' + n.solicitud_id + ': ' + n.mensaje + '</span>' +
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
    btnCargar.addEventListener('click', function () {
        filtroRrhh.style.display = '';
        cargarEmpleados();
    });
    buscarEmpleado.addEventListener('input', seleccionarEmpleado);
    buscarEmpleado.addEventListener('change', seleccionarEmpleado);
})();
