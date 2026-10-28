## 11. Orquestación del flujo de trabajo

Cómo encara el agente una tarea de principio a fin: qué mirar antes de tocar código, cuándo planificar,
cómo verificar antes de decir "terminado" y cómo aprender de las correcciones. No repite [14-agent-efficiency.md](./14-agent-efficiency.md)
(modo de comunicación, consulta a otros agentes, reparto orquestador/subagentes): eso vive ahí.

Índice: [11.1](#111-explorar-antes-de-editar) Explorar antes de editar ·
[11.2](#112-plan-para-tareas-no-triviales) Plan para tareas no triviales ·
[11.3](#113-verificación-antes-de-dar-por-terminado) Verificación antes de "terminado" ·
[11.4](#114-commits-pequeños-y-acotados) Commits pequeños ·
[11.5](#115-no-ampliar-el-alcance) No ampliar el alcance ·
[11.6](#116-preguntar-todo-lo-necesario-una-sola-vez-antes-de-empezar) Preguntar todo antes de empezar ·
[11.7](#117-causa-raíz-y-simplicidad) Causa raíz, simplicidad y sin sobreingeniería ·
[11.8](#118-ciclo-de-auto-mejora-taskslessonsmd) Ciclo de auto-mejora.

### 11.1 Explorar antes de editar

- Un pedido de solo lectura (pregunta, explicación, revisión, "¿cómo funciona X?") **sigue siendo de
  solo lectura**: se responde sin editar archivos. Si la respuesta sugiere un cambio, proponerlo en una
  línea y esperar a que el usuario lo pida.
- Antes de tocar un archivo: leer lo que se edita con su contexto (no solo la línea del pedido; el grafo dice dónde, §14.5) y revisar quién lo usa
  (callers, tipos relacionados). Editar a ciegas sobre un fragmento genera regresiones que el
  diff no deja ver.
- Buscar la convención ya usada en el módulo/feature (naming, estructura, forma de resolver un caso
  parecido) antes de imponer un patrón propio nuevo.
- Si el pedido es ambiguo sobre **qué** archivos toca, localizar primero (búsqueda por símbolo, grep) y
  confirmar el alcance real antes de escribir una línea.
- La exploración pesada (repos grandes, buscar en múltiples carpetas) se delega a un subagente barato;
  ver [14-agent-efficiency.md](./14-agent-efficiency.md) §14.3.

### 11.2 Plan para tareas no triviales

**Clasificar antes de empezar**: la pregunta es si la tarea
se puede **retomar en otra sesión solo con el pedido y `git diff`**. La cantidad de archivos no decide.

| Clase | Criterio | Cómo se trabaja |
| :--- | :--- | :--- |
| **Chica** | Se retoma con el pedido + `git diff` (un arreglo, un ajuste de un componente, un rename) | Directo, sin documento de tarea. Subagentes solo si cumplen §14.3.4 |
| **Grande** | No se retoma sin más contexto: decisiones de diseño, varias etapas, pasos que dependen de otros, más de una sesión | Documento de tarea en `tasks/todo.md` antes de programar |

**Documento de tarea** (`tasks/todo.md`, una tarea grande a la vez):

```markdown
# <feature>
L1: <pedido del usuario, literal, sin resumir>

## Specs
- S1: <comportamiento esperado, verificable>
- S2: ...

## Tasks
- [ ] T1 (S1): <unidad chica, con criterio de hecho> — riesgo: trivial | medio | alto
- [ ] T2 (S2): ...

## Log
- <fecha> T1 hecho: <decisión tomada y su porqué, archivos tocados>
```

- `L1` guarda el pedido literal: es la referencia para no ampliar el alcance (§11.5).
- Cada tarea apunta a una spec y lleva su riesgo (§11.3). Se marca al completarla y se anota en `Log`;
  la lista no se reescribe entera.
- Se implementa **tarea por tarea**: terminar, verificar y anotar una antes de la siguiente.
- Al cerrar la feature: todas las specs verificadas y el documento se vacía o se borra.
- Un plan no trivial se relee de forma crítica (o se valida con el usuario cuando la tarea lo amerita)
  antes de arrancar la implementación: cambiar de rumbo después de escribir código sale más caro que
  ajustar el plan a tiempo.
- Si a mitad de camino una asunción del plan resulta falsa (la API no se comporta como se pensaba, el
  alcance real es otro), **parar y replanificar** en el momento, no seguir forzando el plan original.

### 11.3 Verificación antes de dar por "terminado"

- Nunca marcar una tarea como terminada sin probar que funciona: `ng build` y lint sin errores y, salvo en riesgo
  trivial (§11.3), prueba manual del flujo en la app (ver [08-sin-tests.md](./08-sin-tests.md) §8.3). Sin tests.
- Si el bug o la feature tiene un caso reproducible (error en consola, log de producción, pasos en la
  UI), demostrar que ahora desaparece — no alcanza con "debería andar".
- Ante un arreglo que se siente parche: preguntarse si resuelve la causa raíz (§11.7) o solo tapa el
  síntoma.
- Antes de reportar el cambio, releer el diff completo (no solo el archivo pedido): código muerto,
  imports sin usar, o el error original sin resolver de fondo no deberían llegar a revisión.
- Código muerto: borrar solo lo que el propio cambio dejó sin uso (imports, variables, métodos). El
  código muerto que ya existía se reporta en una línea y no se toca (§11.5).

**Revisión según el riesgo**. El cambio se congela antes de
revisarlo: la revisión no agrega features.

| Riesgo | Cuándo | Revisión |
| :--- | :--- | :--- |
| **Trivial** | No cambia comportamiento: textos visibles, estilos SCSS sin selectores ni mixins nuevos, HTML estático (sin bindings ni control flow), rename mecánico, comentarios, formato | Releer el diff + build/lint + tabla rápida de §15.2 |
| **Medio** | Todo lo demás: lógica de componente o servicio, bindings, formularios, rutas, SCSS nuevo | Lo anterior + `ponytail-review` sobre el diff |
| **Alto** | Auth, tokens, interceptores, permisos, datos sensibles, `package.json`, borrar o migrar datos | Lo anterior + revisor independiente (`revisor-checklist` o `/code-review`) + revisión ofensiva profunda con la skill del área (§15.14, tabla de skills) |

- **Doble juez**, solo en riesgo alto con mucho en juego (auth,
  migración de datos, interceptor de tokens): dos revisores independientes en paralelo, que no ven el
  resultado del otro, sobre el mismo diff. Hallazgo que marcan los dos: se corrige. Hallazgo de uno
  solo: lo decide el orquestador leyendo el código. Después de corregir, un solo re-chequeo.
- Una sola ronda de corrección por hallazgo. Si la corrección no cierra, reportarlo al usuario en vez
  de iterar.
- Commit, push y release los decide el usuario.

### 11.4 Commits pequeños y acotados

- Un commit = un cambio lógico coherente (una corrección, una feature chica, un refactor). No mezclar
  refactor y feature en el mismo commit: dificulta el review y el revert selectivo.
- Tamaño: unas **400 líneas escritas** por commit como máximo. Una tarea grande se parte en varios
  commits, uno por tarea (o grupo de tareas) del documento de §11.2.
- Un cambio de riesgo alto (§11.3) va en su propio commit, sin mezclar con el resto.
- El mensaje describe el **por qué** del cambio; el **qué** ya lo muestra el diff.
- Si una tarea terminó tocando módulos sin relación entre sí, separarlos en commits distintos aunque se
  hayan hecho en la misma sesión de trabajo.

### 11.5 No ampliar el alcance

- Resolver exactamente lo pedido, aunque la skill prefiera otro enfoque: hacerlo y proponer la
  alternativa en una línea. No reescribir la arquitectura por cuenta propia.
- Respetar el estilo del archivo que se edita (nombres, formato, forma de los comentarios), aunque se
  haría distinto. No reformatear ni "mejorar" líneas vecinas que la tarea no toca.
- Si en el camino aparece otro problema (bug ajeno a la tarea, código
  mejorable, TODO viejo), anotarlo y reportarlo — no arreglarlo de paso dentro del mismo cambio.
- Un refactor "ya que estamos" que no hace falta para la tarea pedida se propone aparte, no se aplica
  sin que el usuario lo pida.
- Excepción: un cambio mínimo indispensable para que la tarea pedida compile o funcione (ej. ajustar un
  tipo que rompe con el cambio) sí entra en el mismo commit, documentado en el mensaje.

### 11.6 Preguntar todo lo necesario, una sola vez, antes de empezar

- Antes de una tarea no trivial (§11.2), identificar **todo** lo que falta saber para hacerla bien:
  alcance, comportamiento esperado, casos borde, restricciones, preferencias entre caminos válidos.
- Juntar esas dudas y preguntarlas **en un solo turno**, antes de escribir código. Preguntar de a una
  a mitad de camino corta el trabajo varias veces y obliga a rehacer lo ya hecho.
- Cada pregunta con opciones concretas y una **recomendada** con su razón corta. En Claude Code usar
  `AskUserQuestion` (hasta 4 preguntas por llamada, con opciones).
- Si durante la tarea aparece una duda nueva que cambia el resultado, parar y preguntar. Si no lo
  cambia, elegir la opción razonable, seguir y mencionarla en el reporte final.
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

#### 11.7.1 Sin sobreingeniería

**Regla**: la solución más simple que resuelve lo pedido hoy. Nada "por si acaso". Código simple se
lee, se revisa y se cambia más rápido que una abstracción.

**Prohibido sin un caso real que lo pida:**

| ❌ Sobreingeniería | ✅ Simple |
| :--- | :--- |
| Interfaz + clase abstracta + factory para una sola implementación | Una clase o función |
| `InjectionToken` / `useFactory` para un valor que nunca cambia | Una constante exportada |
| Servicio "genérico" (`BaseCrudService<T>`) para un solo endpoint | El servicio concreto |
| Componente configurable con 8 inputs para un único uso | El componente concreto |
| Partir en subcomponentes un template chico o usado una sola vez | Dejarlo en el template del padre (§1.4) |
| Capa de "adapters" o "repositories" sobre `HttpClient` / `httpResource` | Llamar directo desde el servicio |
| Store propio (estilo NgRx) para estado de una pantalla | Signals en el componente o en su servicio |
| Utilidades, tipos o helpers "para el futuro" | Nada. Se crean cuando aparece el segundo uso |
| Librería nueva para algo que Angular o la plataforma ya resuelven | La API nativa |

**Cuándo sí abstraer:** cuando el mismo código aparece **por segunda vez** (§1.5, §7.10), o cuando el
usuario lo pide. Nunca antes.

**Chequeo antes de entregar:**
- ¿Un dev nuevo entiende el cambio en 5 minutos?
- ¿Cada archivo, clase, input y parámetro nuevo tiene un uso hoy?
- ¿Se puede borrar algo y sigue funcionando? Entonces sobra: borrarlo.

Si la solución simple tiene un límite real (rendimiento, seguridad), elegir la simple igual y avisar
el límite en una línea. El usuario decide si vale la complejidad extra.

### 11.8 Ciclo de auto-mejora: `tasks/lessons.md`

- Después de una corrección del usuario (rechazó un enfoque, señaló un error, pidió deshacer algo),
  registrar en `tasks/lessons.md` solo lo que ayudaría a sesiones futuras: qué se hizo mal y la regla
  concreta. Un tropiezo puntual de esta sesión no se vuelve regla.
- Formato de cada lección, 4 líneas cortas:

  ```markdown
  ## <tema corto, estable: si el tema vuelve, se actualiza esta entrada>
  - Qué: <lo que pasó>
  - Por qué: <causa>
  - Dónde: <archivo, comando o área>
  - Regla: <qué hacer la próxima vez>
  ```
- Revisar `tasks/lessons.md` al arrancar una sesión nueva sobre el mismo proyecto, antes de planificar.
- Iterar sobre las lecciones ya escritas: si una regla no bajó la tasa de errores, reformularla en vez
  de acumular reglas redundantes o contradictorias.

---
