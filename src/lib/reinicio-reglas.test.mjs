import { test, expect } from 'bun:test';
import { validarConfirmacionReinicio } from './reinicio-reglas';
test('No permite reiniciar sin descargar respaldo',()=>{expect(()=>validarConfirmacionReinicio('REINICIAR TODOS',false)).toThrow('Descarga');});
test('Exige confirmación exacta en el segundo paso',()=>{expect(()=>validarConfirmacionReinicio('REINICIAR',true)).toThrow('REINICIAR TODOS');expect(()=>validarConfirmacionReinicio('REINICIAR TODOS',true)).not.toThrow();});