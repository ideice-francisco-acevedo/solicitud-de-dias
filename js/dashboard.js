(function () {
    'use strict';

    const API_BASE = 'api/';
    const spinner = document.getElementById('spinner');

    let usuario = null;
    let empleadoId = 0;
    let rrhhId = 0;
    let esRrhh = false;
    let todosEmpleadosRrhh = [];
    let notifPollTimer = null;
    let rechazoPendiente = { solicitudId: 0, estadoId: 0 };

    function mostrarSpinner() { spinner.classList.remove('hidden'); }
    function ocultarSpinner() { spinner.classList.add('hidden'); }

    function normalizarCedula(v) {
        var d = v.replace(/\D/g, '');
        if (d.length === 11) d = d.substring(0,3) + '-' + d.substring(3,10) + '-' + d.substring(10,11);
        return d;
    }

    function estadoClase(id) {
        if (id === 1) return 'estado-pendiente';
        if (id === 2) return 'estado-aprobado';
        return 'estado-rechazado';
    }

    async function verificarSesion() {
        try {
            var resp = await fetch(API_BASE + 'verificar_sesion.php');
            var data = await resp.json();
            if (!data.logueado) { window.location.href = 'login.html'; return; }
            usuario = data.usuario;
            empleadoId = usuario.id;
            esRrhh = usuario.rol === 'rrhh' || usuario.rol === 'admin';
            var esAdmin = usuario.rol === 'admin';
            document.getElementById('nombreUsuario').textContent = usuario.nombre;

            var badgeEl = document.getElementById('rolBadge');
            if (esAdmin) {
                badgeEl.textContent = 'Admin';
                badgeEl.className = 'rol-badge rol-admin';
            } else if (esRrhh) {
                badgeEl.textContent = 'RRHH';
                badgeEl.className = 'rol-badge rol-rrhh';
            } else {
                badgeEl.textContent = 'Empleado';
                badgeEl.className = 'rol-badge rol-empleado';
            }

            if (esRrhh) {
                document.getElementById('navRrhh').classList.remove('hidden');
                rrhhId = empleadoId;
            }
            if (esAdmin) {
                document.getElementById('navRoles').classList.remove('hidden');
            }
            document.getElementById('welcomeMsg').textContent = 'Bienvenido/a, ' + usuario.nombre;
            document.getElementById('welcomeSub').textContent = usuario.puesto + ' - ' + usuario.area;
            cargarStats();
            iniciarPollingNotificaciones();
        } catch (e) {
            window.location.href = 'login.html';
        }
    }

    async function cargarStats() {
        try {
            var resp = await fetch(API_BASE + 'dashboard_stats.php');
            var data = await resp.json();
            if (data.success) {
                document.getElementById('statTotal').textContent = data.total;
                document.getElementById('statPendientes').textContent = data.pendientes;
                document.getElementById('statAprobadas').textContent = data.aprobadas;
                document.getElementById('statRechazadas').textContent = data.rechazadas;
            }
        } catch (e) {}
    }

    function mostrarSeccion(seccion) {
        document.querySelectorAll('.section').forEach(function (s) { s.classList.add('hidden'); });
        document.getElementById('seccion' + seccion).classList.remove('hidden');
        document.querySelectorAll('.nav-link[data-section]').forEach(function (a) { a.classList.remove('active'); });
        var nav = document.querySelector('.nav-link[data-section="' + seccion.toLowerCase() + '"]');
        if (nav) nav.classList.add('active');

        var titulos = { Inicio: 'Inicio', Nueva: 'Nueva Solicitud', Mis: 'Mis Solicitudes', Rrhh: 'Panel RRHH', Roles: 'Gestionar Roles' };
        document.getElementById('tituloSeccion').textContent = titulos[seccion] || seccion;

        if (seccion === 'Inicio') cargarStats();
        if (seccion === 'Mis') cargarMisSolicitudes();
        if (seccion === 'Rrhh') cargarPanelRrhh();
        if (seccion === 'Roles') cargarRoles();
    }

    async function enviarNuevaSolicitud() {
        var tipo = document.querySelector('input[name="tipo_dia_dash"]:checked');
        if (!tipo) { alert('Seleccione tipo de día'); return; }

        var diaS = document.getElementById('diaSolicitadoDash').value;
        if (!diaS) { alert('Seleccione el día solicitado'); return; }

        if (tipo.value === '2') {
            var info = document.getElementById('infoCumpleDash');
            if (!info.classList.contains('hidden') && info.classList.contains('invalid')) {
                alert('El día de cumpleaños no es válido'); return;
            }
        }

        var formData = {
            fecha_solicitud: document.getElementById('fechaSolicitudDash').value,
            empleado_id: empleadoId,
            creado_por_id: empleadoId,
            rrhh_id: rrhhId,
            dia_solicitado: diaS,
            tipo_dia_id: parseInt(tipo.value),
            observaciones: document.getElementById('obsDash').value.trim()
        };

        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'enviar_solicitud.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
            });
            var data = await resp.json();
            if (data.success) {
                alert('Solicitud enviada correctamente');
                limpiarFormularioDash();
                mostrarSeccion('Inicio');
            } else {
                alert(data.error || 'Error');
            }
        } catch (e) {
            alert('Error');
        } finally {
            ocultarSpinner();
        }
    }

    function limpiarFormularioDash() {
        document.getElementById('fechaSolicitudDash').value = '';
        document.getElementById('diaSolicitadoDash').value = '';
        var radios = document.querySelectorAll('input[name="tipo_dia_dash"]');
        radios.forEach(function (r) { r.checked = false; });
        document.getElementById('chkObsDash').checked = false;
        document.getElementById('filaObsDash').style.display = 'none';
        document.getElementById('obsDash').value = '';
        document.getElementById('infoCumpleDash').classList.add('hidden');
    }

    async function verificarCumpleDash() {
        var tipo = document.querySelector('input[name="tipo_dia_dash"]:checked');
        if (!tipo || tipo.value !== '2') { document.getElementById('infoCumpleDash').classList.add('hidden'); return; }
        var dia = document.getElementById('diaSolicitadoDash').value;
        if (!dia || !usuario) { return; }
        try {
            var resp = await fetch(API_BASE + 'verificar_cumpleanos.php?cedula=' + encodeURIComponent(usuario.cedula) + '&dia_solicitado=' + dia);
            var data = await resp.json();
            var box = document.getElementById('infoCumpleDash');
            box.classList.remove('hidden');
            box.className = 'info-box ' + (data.valido ? 'valid' : 'invalid');
            box.innerHTML = '<span class="info-icon">&#9432;</span> ' + data.mensaje;
        } catch (e) { }
    }

    async function cargarMisSolicitudes() {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'listar_solicitudes.php?cedula=' + encodeURIComponent(usuario.cedula));
            var data = await resp.json();
            var tbody = document.getElementById('tablaMis');
            tbody.innerHTML = '';
            if (!data.solicitudes || data.solicitudes.length === 0) {
                document.getElementById('sinMis').classList.remove('hidden');
            } else {
                document.getElementById('sinMis').classList.add('hidden');
                data.solicitudes.forEach(function (s) {
                    var tr = document.createElement('tr');
                    tr.setAttribute('data-solicitud', JSON.stringify(s));
                    var obs = s.observaciones || '-';
                    if (s.motivo_rechazo) obs += '<br><small class="motivo-rechazo">Rechazo: ' + s.motivo_rechazo + '</small>';
                    var chkActivo = s.esta_activo ? ' checked' : '';
                    tr.innerHTML =
                        '<td data-label="ID">' + s.id + '</td><td data-label="F.Solicitud">' + s.fecha_solicitud + '</td><td data-label="Día">' + s.dia_solicitado + '</td>' +
                        '<td data-label="Tipo">' + s.tipo_dia_nombre + '</td><td data-label="Estado"><span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span></td>' +
                        '<td data-label="Obs.">' + obs + '</td>' +
                        '<td data-label="Activo"><input type="checkbox" class="chk-activo chk-activo-mis" data-id="' + s.id + '"' + chkActivo + '></td>' +
                        '<td data-label="Acción">' + (s.estado_id === 1 ? '<button class="btn btn-sm btn-editar">Editar</button>' : '<span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span>') + '</td>';
                    tbody.appendChild(tr);
                });
                tbody.querySelectorAll('.btn-editar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var s = JSON.parse(this.closest('tr').getAttribute('data-solicitud'));
                        abrirModalEmpleado(s);
                    });
                });
                tbody.querySelectorAll('.chk-activo-mis').forEach(function (chk) {
                    if (esRrhh) {
                        chk.addEventListener('change', function () {
                            toggleActivo(parseInt(this.dataset.id), this.checked ? 1 : 0);
                        });
                    } else {
                        chk.disabled = true;
                    }
                });
            }
            cargarNotificaciones(empleadoId, 'badgeMis', 'notifMis');
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    async function cargarPanelRrhh() {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'listar_solicitudes.php?todos=1');
            var data = await resp.json();
            var tbody = document.getElementById('tablaRrhh');
            tbody.innerHTML = '';
            if (!data.solicitudes || data.solicitudes.length === 0) {
                document.getElementById('sinRrhh').classList.remove('hidden');
            } else {
                document.getElementById('sinRrhh').classList.add('hidden');
                data.solicitudes.forEach(function (s) {
                    var tr = document.createElement('tr');
                    tr.setAttribute('data-solicitud', JSON.stringify(s));
                    var obs = s.observaciones || '-';
                    if (s.motivo_rechazo) obs += '<br><small class="motivo-rechazo">Rechazo: ' + s.motivo_rechazo + '</small>';
                    var acc = '';
                    if (s.estado_id === 1) {
                        acc = '<button class="btn btn-sm btn-editar">Editar</button> ' +
                              '<button class="btn btn-sm btn-aprobar" data-id="' + s.id + '" data-estado="2">Aprobar</button> ' +
                              '<button class="btn btn-sm btn-rechazar" data-id="' + s.id + '" data-estado="3">Rechazar</button>';
                    } else {
                        acc = '<span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span>';
                        if (usuario && usuario.rol === 'admin') {
                            acc += ' <button class="btn btn-sm btn-restaurar" data-id="' + s.id + '" data-estado="1">Restaurar</button>';
                        }
                    }
                    var chkActivo = s.esta_activo ? ' checked' : '';
                    tr.innerHTML =
                        '<td data-label="ID">' + s.id + '</td><td data-label="F.Solicitud">' + s.fecha_solicitud + '</td><td data-label="Empleado">' + s.empleado_nombre + '</td>' +
                        '<td data-label="Día">' + s.dia_solicitado + '</td><td data-label="Tipo">' + s.tipo_dia_nombre + '</td>' +
                        '<td data-label="Estado"><span class="estado-badge ' + estadoClase(s.estado_id) + '">' + s.estado_nombre + '</span></td>' +
                        '<td data-label="Obs.">' + obs + '</td>' +
                        '<td data-label="Activo"><input type="checkbox" class="chk-activo" data-id="' + s.id + '"' + chkActivo + '></td>' +
                        '<td data-label="Acción">' + acc + '</td>';
                    tbody.appendChild(tr);
                });

                tbody.querySelectorAll('.chk-activo').forEach(function (chk) {
                    chk.addEventListener('change', function () {
                        toggleActivo(parseInt(this.dataset.id), this.checked ? 1 : 0);
                    });
                });
                tbody.querySelectorAll('.btn-editar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var s = JSON.parse(this.closest('tr').getAttribute('data-solicitud'));
                        abrirModalRrhh(s);
                    });
                });
                tbody.querySelectorAll('.btn-aprobar, .btn-rechazar, .btn-restaurar').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        cambiarEstadoRrhh(this.dataset.id, parseInt(this.dataset.estado));
                    });
                });
            }
            cargarNotificaciones(empleadoId, 'badgeRrhh', 'notifRrhh');
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    function abrirModalEmpleado(s) {
        document.getElementById('editSolicitudId').value = s.id;
        document.getElementById('editFechaSolicitud').value = s.fecha_solicitud;
        document.getElementById('editObservaciones').value = s.observaciones || '';
        document.getElementById('editDiaSolicitado').value = '';
        document.getElementById('editRrhhFields').style.display = 'none';
        document.getElementById('modalEditar').classList.remove('hidden');
        document.getElementById('modalEditar').setAttribute('data-modo', 'empleado');
    }

    function abrirModalRrhh(s) {
        document.getElementById('editSolicitudId').value = s.id;
        document.getElementById('editFechaSolicitud').value = s.fecha_solicitud;
        document.getElementById('editDiaSolicitado').value = s.dia_solicitado;
        document.getElementById('editTipoDia').value = s.tipo_dia_id;
        document.getElementById('editEstado').value = s.estado_id;
        document.getElementById('editObservaciones').value = s.observaciones || '';
        document.getElementById('editRrhhFields').style.display = '';
        document.getElementById('modalEditar').classList.remove('hidden');
        document.getElementById('modalEditar').setAttribute('data-modo', 'rrhh');
    }

    function cerrarModal() { document.getElementById('modalEditar').classList.add('hidden'); }

    async function guardarEdicion() {
        var modo = document.getElementById('modalEditar').getAttribute('data-modo');
        var body = {
            solicitud_id: parseInt(document.getElementById('editSolicitudId').value),
            empleado_id: empleadoId,
            fecha_solicitud: document.getElementById('editFechaSolicitud').value,
            observaciones: document.getElementById('editObservaciones').value
        };
        if (modo === 'rrhh') {
            body.dia_solicitado = document.getElementById('editDiaSolicitado').value;
            body.tipo_dia_id = parseInt(document.getElementById('editTipoDia').value);
            body.estado_id = parseInt(document.getElementById('editEstado').value);
        }
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'actualizar_solicitud.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            var data = await resp.json();
            if (data.success) {
                cerrarModal();
                var seccionActiva = document.querySelector('.section:not(.hidden)').id;
                if (seccionActiva === 'seccionMis') cargarMisSolicitudes();
                if (seccionActiva === 'seccionRrhh') cargarPanelRrhh();
            } else { alert(data.error || 'Error'); }
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    async function cambiarEstadoRrhh(solicitudId, estadoId) {
        if (estadoId === 3) {
            rechazoPendiente = { solicitudId: solicitudId, estadoId: estadoId };
            document.getElementById('motivoRechazo').value = '';
            document.getElementById('rechazoError').classList.add('hidden');
            document.getElementById('modalRechazo').classList.remove('hidden');
            return;
        } else if (estadoId === 1) {
            if (!confirm('¿Restaurar solicitud a pendiente?')) return;
        } else {
            if (!confirm('¿Aprobar solicitud?')) return;
        }
        ejecutarCambioEstado(solicitudId, estadoId, '');
    }

    async function ejecutarCambioEstado(solicitudId, estadoId, motivo) {
        mostrarSpinner();
        try {
            var body = { solicitud_id: solicitudId, estado_id: estadoId, motivo_rechazo: motivo };
            var resp = await fetch(API_BASE + 'cambiar_estado.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            });
            var data = await resp.json();
            if (data.success) cargarPanelRrhh(); else alert(data.error || 'Error');
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    async function toggleActivo(solicitudId, activo) {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'toggle_activo.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ solicitud_id: solicitudId, activo: activo })
            });
            var data = await resp.json();
            if (!data.success) {
                alert(data.error || 'Error al cambiar estado');
                cargarPanelRrhh();
            }
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    async function cargarRoles() {
        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'listar_usuarios.php');
            var data = await resp.json();
            if (!data.success) throw new Error('Error');

            var tbody = document.getElementById('tablaRoles');
            tbody.innerHTML = '';

            var rolesOptions = '';
            data.roles.forEach(function (r) {
                rolesOptions += '<option value="' + r.id + '">' + r.nombre + '</option>';
            });

            data.usuarios.forEach(function (u) {
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td data-label="ID">' + u.id + '</td>' +
                    '<td data-label="Empleado">' + u.nombre + '</td>' +
                    '<td data-label="Rol Actual"><span class="rol-badge ' + (u.rol_id === 1 ? 'rol-admin' : u.rol_id === 2 ? 'rol-rrhh' : 'rol-empleado') + '">' + u.rol_nombre + '</span></td>' +
                    '<td data-label="Nuevo Rol"><select class="select-rol" data-usuario-id="' + u.id + '">' + rolesOptions + '</select></td>' +
                    '<td data-label="Acción"><button class="btn btn-sm btn-editar btn-guardar-rol" data-usuario-id="' + u.id + '">Guardar</button></td>';
                tr.querySelector('select').value = u.rol_id;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.btn-guardar-rol').forEach(function (btn) {
                btn.addEventListener('click', async function () {
                    var usuarioId = parseInt(this.dataset.usuarioId);
                    var select = document.querySelector('.select-rol[data-usuario-id="' + usuarioId + '"]');
                    var rolId = parseInt(select.value);
                    try {
                        var respUpd = await fetch(API_BASE + 'cambiar_rol.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ usuario_id: usuarioId, rol_id: rolId })
                        });
                        var dataUpd = await respUpd.json();
                        if (dataUpd.success) cargarRoles(); else alert(dataUpd.error);
                    } catch (e) { alert('Error'); }
                });
            });
        } catch (e) { alert('Error'); } finally { ocultarSpinner(); }
    }

    async function cargarNotificaciones(empId, badgeId, listId) {
        try {
            var nlr = await fetch(API_BASE + 'notificaciones_no_leidas.php?empleado_id=' + empId);
            var nl = await nlr.json();
            var badge = document.getElementById(badgeId);
            if (nl.no_leidas > 0) { badge.textContent = nl.no_leidas; badge.classList.remove('hidden'); }
            else { badge.classList.add('hidden'); }

            var nr = await fetch(API_BASE + 'notificaciones.php?empleado_id=' + empId);
            var nd = await nr.json();
            var list = document.getElementById(listId);
            list.innerHTML = '';
            if (!nd.notificaciones || nd.notificaciones.length === 0) {
                list.innerHTML = '<li class="notif-vacia">No hay notificaciones</li>'; return;
            }
            nd.notificaciones.forEach(function (n) {
                var li = document.createElement('li');
                li.className = 'notif-item' + (n.leida ? '' : ' notif-no-leida');
                li.innerHTML = '<span>' + n.mensaje + '</span><small>' + n.created_at + '</small>';
                if (!n.leida) { li.style.cursor = 'pointer'; li.addEventListener('click', function () { marcarLeida(n.id, empId, badgeId, listId); }); }
                list.appendChild(li);
            });
        } catch (e) {
            console.error('[notif] error cargando notificaciones (' + badgeId + '):', e);
        }
    }

    async function iniciarPollingNotificaciones() {
        detenerPollingNotificaciones();
        async function poll() {
            if (!empleadoId) return;
            try {
                console.log('[poll] consultando notificaciones para empleado', empleadoId);
                await cargarNotificaciones(empleadoId, 'badgeMis', 'notifMis');
                if (esRrhh) {
                    await cargarNotificaciones(empleadoId, 'badgeRrhh', 'notifRrhh');
                }
            } catch (e) {
                console.error('[poll] error:', e);
            }
            notifPollTimer = setTimeout(poll, 10000);
        }
        console.log('[poll] iniciando polling cada 5s');
        poll();
    }

    function detenerPollingNotificaciones() {
        if (notifPollTimer) {
            clearTimeout(notifPollTimer);
            notifPollTimer = null;
        }
    }

    async function marcarLeida(id, empId, badgeId, listId) {
        await fetch(API_BASE + 'marcar_notificacion_leida.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id })
        });
        cargarNotificaciones(empId, badgeId, listId);
    }

    async function logout() {
        detenerPollingNotificaciones();
        await fetch(API_BASE + 'logout.php');
        window.location.href = 'login.html';
    }

    async function cambiarPassword() {
        var actual = document.getElementById('passActual').value;
        var nueva = document.getElementById('passNueva').value;
        var confirmar = document.getElementById('passConfirmar').value;
        var errorEl = document.getElementById('passError');
        errorEl.classList.add('hidden');

        if (!actual || !nueva || !confirmar) { errorEl.textContent = 'Complete todos los campos'; errorEl.classList.remove('hidden'); return; }
        if (nueva !== confirmar) { errorEl.textContent = 'Las contraseñas no coinciden'; errorEl.classList.remove('hidden'); return; }
        if (nueva.length < 4) { errorEl.textContent = 'Mínimo 4 caracteres'; errorEl.classList.remove('hidden'); return; }

        mostrarSpinner();
        try {
            var resp = await fetch(API_BASE + 'cambiar_password.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actual: actual, nueva: nueva })
            });
            var data = await resp.json();
            if (data.success) {
                alert('Contraseña actualizada');
                document.getElementById('modalPassword').classList.add('hidden');
                document.getElementById('passActual').value = '';
                document.getElementById('passNueva').value = '';
                document.getElementById('passConfirmar').value = '';
            } else {
                errorEl.textContent = data.error || 'Error';
                errorEl.classList.remove('hidden');
            }
        } catch (e) { errorEl.textContent = 'Error de conexión'; errorEl.classList.remove('hidden'); }
        finally { ocultarSpinner(); }
    }

    async function confirmarRechazo() {
        var motivo = document.getElementById('motivoRechazo').value.trim();
        if (!motivo) {
            document.getElementById('rechazoError').textContent = 'Debe escribir un motivo';
            document.getElementById('rechazoError').classList.remove('hidden');
            return;
        }
        document.getElementById('modalRechazo').classList.add('hidden');
        ejecutarCambioEstado(rechazoPendiente.solicitudId, rechazoPendiente.estadoId, motivo);
    }

    function cancelarRechazo() {
        document.getElementById('modalRechazo').classList.add('hidden');
        document.getElementById('motivoRechazo').value = '';
        document.getElementById('rechazoError').classList.add('hidden');
    }

    document.querySelectorAll('.nav-link[data-section]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            mostrarSeccion(this.getAttribute('data-section').charAt(0).toUpperCase() + this.getAttribute('data-section').slice(1));
            var sidebar = document.getElementById('sidebar');
            var backdrop = document.getElementById('sidebarBackdrop');
            sidebar.classList.remove('collapsed', 'open');
            backdrop.classList.remove('visible');
        });
    });

    document.getElementById('btnLogout').addEventListener('click', function (e) { e.preventDefault(); logout(); });
    document.getElementById('btnCambiarPassword').addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('modalPassword').classList.remove('hidden');
    });
    document.getElementById('btnGuardarPassword').addEventListener('click', cambiarPassword);
    document.getElementById('btnCancelarPassword').addEventListener('click', function () {
        document.getElementById('modalPassword').classList.add('hidden');
        document.getElementById('passActual').value = '';
        document.getElementById('passNueva').value = '';
        document.getElementById('passConfirmar').value = '';
        document.getElementById('passError').classList.add('hidden');
    });
    document.getElementById('btnMenu').addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        var backdrop = document.getElementById('sidebarBackdrop');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('visible');
    });

    document.getElementById('sidebarBackdrop').addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        var backdrop = document.getElementById('sidebarBackdrop');
        sidebar.classList.remove('collapsed', 'open');
        backdrop.classList.remove('visible');
    });

    document.getElementById('btnConfirmarRechazo').addEventListener('click', confirmarRechazo);
    document.getElementById('btnCancelarRechazo').addEventListener('click', cancelarRechazo);

    document.getElementById('btnGuardarEdicion').addEventListener('click', guardarEdicion);
    document.getElementById('btnCancelarEdicion').addEventListener('click', cerrarModal);

    document.getElementById('formSolicitudDash').addEventListener('submit', function (e) { e.preventDefault(); enviarNuevaSolicitud(); });
    document.getElementById('diaSolicitadoDash').addEventListener('change', verificarCumpleDash);
    document.querySelectorAll('input[name="tipo_dia_dash"]').forEach(function (r) {
        r.addEventListener('change', verificarCumpleDash);
    });
    document.getElementById('chkObsDash').addEventListener('change', function () {
        document.getElementById('filaObsDash').style.display = this.checked ? '' : 'none';
        if (!this.checked) document.getElementById('obsDash').value = '';
    });

    var hoy = new Date();
    document.getElementById('fechaSolicitudDash').value = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0') + '-' + String(hoy.getDate()).padStart(2,'0');

    verificarSesion();
})();
