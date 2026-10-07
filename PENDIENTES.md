# Pendientes

## Para salir a producción

- [ ] **Supabase de Panda**: crear el proyecto y seguir `SETUP-SUPABASE.md` (esquema, plantillas
      de mail con `token_hash`, SMTP propio, variables).
- [ ] **Proyecto de Vercel** conectado a `BARDO-BZ/tools-panda`, con las variables cargadas.
- [ ] **Subdominio**: elegir el nombre (ej. `clientes.panda.bz`) y pedir a Rama el CNAME en GoDaddy.
- [ ] **Primer usuario del equipo** (`npm run admin -- crear-usuario … --rol panda`) y **migrar** el
      piloto (`npm run admin -- migrar migracion`). Después, borrar `migracion/` del disco.
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
