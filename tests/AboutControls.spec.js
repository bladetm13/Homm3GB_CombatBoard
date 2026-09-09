import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import AboutControls from '../src/components/AboutControls.vue'

const REPOSITORY_URL = 'https://github.com/bladetm13/Homm3GB_CombatBoard'

const open = async () => {
  const wrapper = mount(AboutControls, { attachTo: document.body })
  await wrapper.get('[data-testid="about-open"]').trigger('click')
  return wrapper
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AboutControls', () => {
  it('shows nothing but the button until it is pressed', () => {
    const wrapper = mount(AboutControls, { attachTo: document.body })

    expect(wrapper.get('[data-testid="about-open"]').attributes('title')).toBe('About')
    expect(document.body.querySelector('[data-testid="about"]')).toBeNull()
  })

  it('opens the dialog out of the board, into body', async () => {
    const wrapper = await open()
    const panel = document.body.querySelector('[data-testid="about"]')

    expect(panel).not.toBeNull()
    expect(wrapper.element.contains(panel)).toBe(false)
  })

  it('says what the tool is and whose game it is', async () => {
    await open()
    const text = document.body.querySelector('[data-testid="about"]').textContent

    expect(text).toContain('informational purposes only')
    expect(text).toContain('Heroes of Might and Magic III: The Board Game')
    expect(text).toContain('Ubisoft Entertainment')
  })

  it('credits the author and offers a mailto link', async () => {
    await open()
    const panel = document.body.querySelector('[data-testid="about"]')
    const email = panel.querySelector('[data-testid="about-author-email"]')

    expect(panel.textContent).toContain('Ihor Kolesnychenko (the_13th)')
    expect(email.getAttribute('href')).toBe('mailto:bladetm13@gmail.com')
    expect(email.textContent.trim()).toBe('bladetm13@gmail.com')
  })

  it('links the licence and the repository, each into its own tab', async () => {
    await open()
    const links = ['about-license', 'about-repository'].map((testid) =>
      document.body.querySelector(`[data-testid="${testid}"]`),
    )

    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }

    expect(links[0].getAttribute('href')).toBe(`${REPOSITORY_URL}/blob/main/LICENSE`)
    expect(links[1].getAttribute('href')).toBe(REPOSITORY_URL)
    expect(links[1].textContent.trim()).toBe(REPOSITORY_URL)
  })

  it('closes on the backdrop, on the close button and on Escape', async () => {
    const wrapper = await open()
    // The dialog is teleported, so it is reached through the document, not the
    // wrapper — and a reopen has to be awaited before it is there to be found.
    const find = (testid) => document.body.querySelector(`[data-testid="${testid}"]`)
    const reopen = () => wrapper.get('[data-testid="about-open"]').trigger('click')
    const dismiss = async (testid) => {
      find(testid).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()
    }

    await dismiss('about-backdrop')
    expect(find('about')).toBeNull()

    await reopen()
    await dismiss('about-close')
    expect(find('about')).toBeNull()

    await reopen()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(find('about')).toBeNull()
  })
})
