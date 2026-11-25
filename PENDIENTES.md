# Pendientes

## Para salir a producción

- [x] **Supabase de Panda**: proyecto creado, esquema corrido, piloto de Sumatoria migrado.
- [x] **SMTP propio (Resend)** configurado en Supabase: los mails salen desde `panda.bz`.
- [ ] **Probar con un mail de afuera** (no miembro del proyecto en Supabase): invitar un usuario
      cliente de prueba y confirmar que le llega la invitación y solo ve su carpeta.
- [ ] **Plan Pro de Supabase** antes de sumar clientes (el gratuito se pausa tras una semana sin uso).
- [x] **Proyecto de Vercel** en `https://tools-panda.vercel.app`, con `SITE_URL` cargada.
- [ ] **Subdominio**: elegir el nombre (ej. `clientes.panda.bz`) y pedir a Rama el CNAME en GoDaddy.
- [x] **Primer usuario del equipo** (`hola@bardo.bz`) y piloto migrado. Falta borrar
      `migracion/` del disco (ya está en Supabase).
- [x] **URL de Vercel** en Supabase (Site URL y *Redirect URLs*): el login anda en producción.
- [ ] **Tipografías PP con licencia web** (hoy son las "Free for Personal Use", igual que en propuestas).
- [ ] Validar el piloto de Sumatoria con Valchi.

## Próxima etapa

- [ ] **Propuestas** como un tipo más (subir/editar/index), con su aceptación y tracking en el
      Supabase de Panda (hoy usan el de Bardo desde `propuestas-panda`).
- [ ] Al re-subir una planificación, volver a "pendiente" las piezas aprobadas que cambiaron
      (hoy la aprobación se conserva aunque la pieza cambie).
- [ ] Borrar documentos desde el panel (hoy solo se reemplazan).
- [ ] Aviso al equipo por mail / ClickUp ante un comentario nuevo y al cerrar el feedback
      (hoy: webhook opcional `AVISO_WEBHOOK_URL` solo al cerrar).
- [ ] Vista "Feed" (grilla de 3 columnas con los últimos posts publicados arriba).
- [ ] Carga del contenido desde ClickUp.
- [ ] Reporte de redes: definir estructura (usa los bloques de la estrategia).
- [ ] Export a Figma Slides cuando haga falta diseño.
