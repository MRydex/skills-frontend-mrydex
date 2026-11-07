## 8. Sin archivos de test

**Regla**: el frontend **no tiene archivos de test**. Nunca generar `*.spec.ts`, `*.test.ts`,
carpetas `tests/` / `__tests__/`, mocks de test ni configuración de test runner. Tampoco
"de paso", ni aunque el ejemplo de una librería o de la documentación de Angular los incluya.
Única excepción: el usuario los pide explícitamente; entonces se hacen.

**Sin archivos de test no es sin probar.** Todo cambio se verifica funcionando antes de darlo por
terminado: build, lint y la prueba del flujo en la app (§8.3). Lo único que no se hace es guardar
tests en el repo.

### 8.1 Angular CLI: `skipTests` por defecto

`ng generate` crea un `.spec.ts` por defecto. Desactivarlo una vez por proyecto en `angular.json`:

```json
"projects": {
  "<proyecto>": {
    "schematics": {
      "@schematics/angular:component": { "skipTests": true },
      "@schematics/angular:service": { "skipTests": true },
      "@schematics/angular:directive": { "skipTests": true },
      "@schematics/angular:pipe": { "skipTests": true },
      "@schematics/angular:guard": { "skipTests": true },
      "@schematics/angular:interceptor": { "skipTests": true },
      "@schematics/angular:resolver": { "skipTests": true },
      "@schematics/angular:class": { "skipTests": true }
    }
  }
}
```

- Proyecto nuevo: `ng new <nombre> --skip-tests`.
- Si `angular.json` todavía no tiene `skipTests`, agregarlo o pasar `--skip-tests` en cada
  `ng generate`.

### 8.2 Proyectos con tests existentes

- No crear ni actualizar ningún `*.spec.ts` salvo pedido explícito del usuario.
- Borrar specs, el target `test` de `angular.json` y las dependencias de test (`vitest`,
  `jasmine`, `karma`, `@angular/build:unit-test`) **solo si el usuario lo confirma**: es un cambio
  que afecta al equipo.
- Si un cambio rompe un spec existente, avisar al usuario. No arreglar el spec por cuenta propia.
- Proyecto que **ya tiene** config de Karma o Vitest, o specs: no borrar la config ni los specs salvo
  que el usuario lo pida, y no sumar specs nuevos. Verificá el estado de los tests antes de empezar
  (§11.3); si tu cambio rompe uno, avisá, no lo arregles por tu cuenta.
- En Claude Code, el hook `guard-spec` ([10](./10-environment-tooling.md) §10.12) le pide confirmación
  al usuario antes de crear `*.spec.ts` / `*.test.ts` en repos Angular. Si el usuario no pidió tests,
  no intentar crearlos.

### 8.3 Cómo se verifica sin archivos de test

"Terminado" = compila, pasa lint y, salvo riesgo trivial (§11.3), se probó en la app:

1. `ng build` sin errores ni warnings nuevos.
2. Lint sin errores (`ng lint` o el linter del proyecto).
3. Prueba manual en el navegador del flujo tocado: caso feliz, errores, estados vacío y de carga.
4. Para seguridad: probar a mano los payloads de [15-security.md](./15-security.md) §15.12.

Quién hace la prueba manual:

- Si el agente tiene un navegador que puede manejar (Claude in Chrome, Playwright MCP, el navegador
  integrado), la hace él: levanta `ng serve`, recorre el flujo y deja evidencia en el reporte
  (captura de cada estado y consola sin errores). Manejar el navegador no es escribir tests: no se
  guarda ningún script ni archivo de test en el repo.
- Si no tiene navegador, lo dice en el reporte y le deja al usuario los pasos concretos a probar
  (URL, datos, qué debería verse). Nunca reportar "probado" sin haberlo probado (§11.3).

---
