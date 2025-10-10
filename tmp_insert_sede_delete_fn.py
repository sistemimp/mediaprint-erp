from pathlib import Path
path = Path("src/views/anagrafica/AnagraficaDetail.js")
text = path.read_text()
marker = "\n\n  const handleContactEdit"
insert_index = text.find(marker)
if insert_index == -1:
    raise SystemExit('marker not found')
new_block = "\n\n  const handleSedeDelete = async (sedeId) => {\n    if (!recordId || !sedeId) {\n      return\n    }\n\n    const confirmed = window.confirm('Confermi l\\'eliminazione della sede?')\n    if (!confirmed) {\n      return\n    }\n\n    setMutationError(null)\n    setEditingSedeId((current) => (current === sedeId ? null : current))\n    setSedeForm(null)\n    setSavingSedeId(sedeId)\n\n    try {\n      const response = await updateAnagraficaDetail({\n        token,\n        id: recordId,\n        sedi: { delete: [sedeId] },\n      })\n      handleMutationSuccess(response)\n    } catch (mutationErrorInstance) {\n      if (mutationErrorInstance.status === 401 && logout) {\n        logout()\n        return\n      }\n      setMutationError(mutationErrorInstance.payload?.message || mutationErrorInstance.message)\n    } finally {\n      setSavingSedeId(null)\n    }\n  }"
text = text[:insert_index] + new_block + text[insert_index:]
path.write_text(text)
