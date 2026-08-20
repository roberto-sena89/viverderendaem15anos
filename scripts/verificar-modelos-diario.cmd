@echo off
REM Verificação diária dos modelos gratuitos dos provedores de IA.
REM Chamado pelo Agendador de Tarefas do Windows (VerificarModelosIA).
cd /d "%~dp0.."
tsx --env-file-if-exists=.env.local scripts\verificar-modelos.ts >> "data\verificacao-modelos.log" 2>&1