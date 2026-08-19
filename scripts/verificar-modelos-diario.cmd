@echo off
REM Verificação diária dos modelos gratuitos dos provedores de IA.
REM Chamado pelo Agendador de Tarefas do Windows (verificar-modelos-diario).
cd /d "%~dp0.."
node scripts\verificar-modelos.ts >> "data\verificacao-modelos.log" 2>&1