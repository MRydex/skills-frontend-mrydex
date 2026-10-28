## 8. Sin archivos de test

**Regla**: el frontend **no tiene archivos de test**. Nunca generar `*.spec.ts`, `*.test.ts`,
carpetas `tests/` / `__tests__/`, mocks de test ni configuración de test runner. Tampoco
"de paso", ni aunque el ejemplo de una librería o de la documentación de Angular los incluya.

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

- No crear ni actualizar ningún `*.spec.ts`.
- Borrar specs, el target `test` de `angular.json` y las dependencias de test (`vitest`,
  `jasmine`, `karma`, `@angular/build:unit-test`) **solo si el usuario lo confirma**: es un cambio
  que afecta al equipo.
- Si un cambio rompe un spec existente, avisar al usuario. No arreglar el spec por cuenta propia.

### 8.3 Cómo se verifica sin tests

"Terminado" = compila, pasa lint y se probó en la app (§11.3):

1. `ng build` sin errores ni warnings nuevos.
2. Lint sin errores (`ng lint` o el linter del proyecto).
3. Prueba manual en el navegador del flujo tocado: caso feliz, errores, estados vacío y de carga.
4. Para seguridad: probar a mano los payloads de [15-security.md](./15-security.md) §15.12.

---
