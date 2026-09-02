/**
 * Hands a finished file to the user.
 *
 * `showSaveFilePicker` is the only way a page can really put up a Save-as
 * dialog; where it is missing — Firefox and Safari, at the time of writing — an
 * anchor is all there is and the browser decides for itself whether to ask or
 * just drop the file in Downloads.
 *
 * The dialog has to be opened while the click that asked for it is still fresh,
 * so it comes first and the bytes are made after: `produce` is only called once
 * there is somewhere to put what it returns. It may return nothing, which is
 * how a caller says it has nothing to save after all.
 */
export async function saveFile({ name, type, extensions, description, produce }) {
  const picker = window.showSaveFilePicker

  if (typeof picker !== 'function') {
    const blob = await produce()
    if (blob) downloadBlob(name, blob)
    return Boolean(blob)
  }

  let handle
  try {
    handle = await picker.call(window, {
      suggestedName: name,
      types: [{ description, accept: { [type]: extensions } }],
    })
  } catch {
    // The user closed the dialog; nothing was going to be written anyway.
    return false
  }

  const blob = await produce()
  if (!blob) return false

  const stream = await handle.createWritable()
  await stream.write(blob)
  await stream.close()
  return true
}

/** The old way: a link nobody sees, clicked on the user's behalf. */
function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // The download has taken its own reference by now; ours can go.
  setTimeout(() => URL.revokeObjectURL(url))
}
