from pathlib import Path
path = Path("backend/src/Service/AnagraficheService.php")
text = path.read_text()
text = text.replace("        $sediOperations = ['create' => [], 'update' => []];", "        $sediOperations = ['create' => [], 'update' => [], 'delete' => []];")
text = text.replace("        if (!$anagraficaData && !$fiscaleData && !$contattiData && !$sediOperations['create'] && !$sediOperations['update']) {", "        if (!$anagraficaData && !$fiscaleData && !$contattiData && !$sediOperations['create'] && !$sediOperations['update'] && !$sediOperations['delete']) {")
text = text.replace("            foreach ($sediOperations['update'] as $entry) {\n                $this->repository->updateSede($id, $entry['id_sede'], $entry['data']);\n            }\n\n            foreach ($sediOperations['create'] as $sedeData) {\n                $this->repository->insertSede($id, $sedeData);\n            }", "            foreach ($sediOperations['update'] as $entry) {\n                $this->repository->updateSede($id, $entry['id_sede'], $entry['data']);\n            }\n\n            foreach ($sediOperations['delete'] as $sedeId) {\n                $this->repository->deleteSede($id, $sedeId);\n            }\n\n            foreach ($sediOperations['create'] as $sedeData) {\n                $this->repository->insertSede($id, $sedeData);\n            }")
path.write_text(text)
