## 11. Orquestación del flujo de trabajo

Cómo encara el agente una tarea de principio a fin: qué mirar antes de tocar código, cuándo planificar,
cómo verificar antes de decir "terminado" y cómo aprender de las correcciones. No repite [14-agent-efficiency.md](./14-agent-efficiency.md)
(modo de comunicación, consulta a otros agentes, reparto orquestador/subagentes): eso vive ahí.

Índice: [11.1](#111-explorar-antes-de-editar) Explorar antes de editar ·
[11.2](#112-plan-para-tareas-no-triviales) Plan para tareas no triviales ·
[11.3](#113-verificación-antes-de-dar-por-terminado) Verificación antes de "terminado" ·
[11.4](#114-commits-pequeños-y-acotados) Commits pequeños ·
[11.5](#115-no-ampliar-el-alcance) No ampliar el alcance ·
[11.6](#116-preguntar-solo-cuando-la-decisión-es-del-usuario) Preguntar solo si la decisión es del usuario ·
[11.7](#117-causa-raíz-y-simplicidad) Causa raíz y simplicidad ·
[11.8](#118-ciclo-de-auto-mejora-taskslessonsmd) Ciclo de auto-mejora.

### 11.1 Explorar antes de editar

- Antes de tocar un archivo: leerlo completo (no solo el fragmento del pedido) y revisar quién lo usa
  (callers, tests, tipos relacionados). Editar a ciegas sobre un fragmento genera regresiones que el
  diff no deja ver.
- Buscar la convención ya usada en el módulo/feature (naming, estructura, forma de resolver un caso
  parecido) antes de imponer un patrón propio nuevo.
- Si el pedido es ambiguo sobre **qué** archivos toca, localizar primero (búsqueda por símbolo, grep) y
  confirmar el alcance real antes de escribir una línea.
- La exploración pesada (repos grandes, buscar en múltiples carpetas) se delega a un subagente barato;
  ver [14-agent-efficiency.md](./14-agent-efficiency.md) §14.3.

### 11.2 Plan para tareas no triviales

- Tarea de **3 o más pasos**, con una decisión de arquitectura, o que toca **3 o más archivos** ⇒
  escribir el plan antes de programar. Tarea de 1-2 pasos mecánicos: ejecutar directo, planificarla
  cuesta más que hacerla.
- El plan vive en `tasks/todo.md` como checklist verificable (ítems chicos, cada uno con un criterio
  claro de "hecho"). Se marca cada ítem al completarlo, no se reescribe la lista entera.
- Un plan no trivial se relee de forma crítica (o se valida con el usuario cuando la tarea lo amerita)
  antes de arrancar la implementación: cambiar de rumbo después de escribir código sale más caro que
  ajustar el plan a tiempo.
- Si a mitad de camino una asunción del plan resulta falsa (la API no se comporta como se pensaba, el
  alcance real es otro), **parar y replanificar** en el momento, no seguir forzando el plan original.

### 11.3 Verificación antes de dar por "terminado"

- Nunca marcar una tarea como terminada sin probar que funciona: correr los tests, el build y el lint
  del proyecto (ver [08-testing-vitest.md](./08-testing-vitest.md)) antes de reportarla como resuelta.
- Si el bug o la feature tiene un caso reproducible (test que fallaba, error en consola, log de
  producción), demostrar que ahora pasa o desaparece — no alcanza con "debería andar".
- Ante un arreglo que se siente parche: preguntarse si resuelve la causa raíz (§11.7) o solo tapa el
  síntoma.
- Antes de reportar el cambio, releer el diff completo (no solo el archivo pedido): código muerto,
  imports sin usar, o el error original sin resolver de fondo no deberían llegar a revisión.

### 11.4 Commits pequeños y acotados

- Un commit = un cambio lógico coherente (una corrección, una feature chica, un refactor). No mezclar
  refactor y feature en el mismo commit: dificulta el review y el revert selectivo.
- El mensaje describe el **por qué** del cambio; el **qué** ya lo muestra el diff.
- Si una tarea terminó tocando módulos sin relación entre sí, separarlos en commits distintos aunque se
  hayan hecho en la misma sesión de trabajo.

### 11.5 No ampliar el alcance

- Resolver exactamente lo pedido. Si en el camino aparece otro problema (bug ajeno a la tarea, código
  mejorable, TODO viejo), anotarlo y reportarlo — no arreglarlo de paso dentro del mismo cambio.
- Un refactor "ya que estamos" que no hace falta para la tarea pedida se propone aparte, no se aplica
  sin que el usuario lo pida.
- Excepción: un cambio mínimo indispensable para que la tarea pedida compile o funcione (ej. ajustar un
  tipo que rompe con el cambio) sí entra en el mismo commit, documentado en el mensaje.

### 11.6 Preguntar solo cuando la decisión es del usuario

- No preguntar por algo que el agente puede resolver solo con la información del repo: convención ya
  usada en un archivo similar, tipo ya definido, patrón ya aplicado en otro módulo.
- Preguntar cuando: la decisión es de negocio o producto (qué debe mostrar la UI, qué regla aplica),
  hay ambigüedad real entre dos caminos técnicos válidos sin una convención del equipo que desempate, o
  la acción es irreversible/riesgosa (borrar datos, `push --force`, romper un contrato público de API).
- Al preguntar, proponer una opción por defecto razonada en vez de una pregunta abierta: "¿Uso X o
  dejo Y? Recomiendo X porque [razón corta]" avanza más rápido que "¿Qué hago acá?".

### 11.7 Causa raíz y simplicidad

- Buscar la causa raíz del problema, no el parche que lo esconde. Un arreglo temporal solo se acepta si
  queda documentado como tal (comentario + motivo) y no se presenta como solución definitiva.
- Cambio mínimo necesario: tocar solo lo que la tarea requiere. Reescribir alrededor "para dejarlo
  prolijo" es scope creep (§11.5), no una mejora gratis.
- Los límites de tamaño de archivo y la regla anti-monolito (componentizar en vez de acumular
  responsabilidades) ya están definidos en [01-project-structure.md](./01-project-structure.md) §1.4: no
  se repiten acá.

### 11.8 Ciclo de auto-mejora: `tasks/lessons.md`

- Después de cualquier corrección del usuario (rechazó un enfoque, señaló un error, pidió deshacer algo)
  registrar el patrón en `tasks/lessons.md`: qué se hizo mal y la regla concreta para no repetirlo.
- Revisar `tasks/lessons.md` al arrancar una sesión nueva sobre el mismo proyecto, antes de planificar.
- Iterar sobre las lecciones ya escritas: si una regla no bajó la tasa de errores, reformularla en vez
  de acumular reglas redundantes o contradictorias.

---
