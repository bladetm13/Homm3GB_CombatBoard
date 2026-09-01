import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenPickerDialog from '../src/components/BoardField/TokenPickerDialog.vue'
import { clearPickerMemory } from '../src/components/BoardField/pickerMemory'
import {
  TOKENS,
  TOKEN_CATEGORY,
  TOKEN_CATEGORY_LABEL,
  TOKEN_SCOPE,
} from '../src/components/BoardField/tokenConstants'

const open = (scope) =>
  mount(TokenPickerDialog, {
    attachTo: document.body,
    props: scope ? { scope } : {},
    global: { stubs: { teleport: true } },
  })

const openGroup = (wrapper, index) =>
  wrapper.findAll('[data-testid="accordion-header"]')[index].trigger('click')

const tokensOf = (scope) =>
  Object.values(TOKENS[scope]).flatMap((group) => Object.values(group))

afterEach(() => {
  document.body.innerHTML = ''
})

// Every picker remembers where it was left; each test starts from a clean one.
beforeEach(clearPickerMemory)

describe('TokenPickerDialog', () => {
  it('teleports out of the board, into body', () => {
    const wrapper = mount(TokenPickerDialog, { attachTo: document.body })
    const panel = document.body.querySelector('[data-testid="token-picker"]')
    expect(panel).not.toBeNull()
    expect(wrapper.element.contains(panel)).toBe(false)
  })

  it('carries its own test hooks, so it never answers for the unit picker', () => {
    const wrapper = open()
    expect(wrapper.find('[data-testid="picker"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a field token',
    )
  })

  it('shows field tokens by default, one group per category', () => {
    const wrapper = open()
    const titles = wrapper.findAll('[data-testid="accordion-header"]').map((h) => h.text())
    const expected = Object.keys(TOKENS[TOKEN_SCOPE.FIELD]).map((c) => TOKEN_CATEGORY_LABEL[c])

    expect(titles).toHaveLength(expected.length)
    expected.forEach((label, i) => expect(titles[i]).toContain(label))
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a field token',
    )
  })

  it('switches the whole list, and the title, with the scope', () => {
    const wrapper = open(TOKEN_SCOPE.UNIT)
    const titles = wrapper.findAll('[data-testid="accordion-header"]').map((h) => h.text())
    const expected = Object.keys(TOKENS[TOKEN_SCOPE.UNIT]).map((c) => TOKEN_CATEGORY_LABEL[c])

    expect(titles).toHaveLength(expected.length)
    expected.forEach((label, i) => expect(titles[i]).toContain(label))
    expect(wrapper.get('[data-testid="token-picker"]').attributes('aria-label')).toBe(
      'Choose a unit token',
    )
  })

  it('never offers a token from the other scope', async () => {
    for (const scope of Object.values(TOKEN_SCOPE)) {
      const wrapper = open(scope)
      for (let i = 1; i < Object.keys(TOKENS[scope]).length; i += 1) await openGroup(wrapper, i)

      const rendered = wrapper
        .findAll('[data-testid^="token-picker-token-"]')
        .map((n) => n.attributes('data-testid').replace('token-picker-token-', ''))
      expect(rendered.toSorted()).toEqual(tokensOf(scope).toSorted())
      for (const token of rendered) expect(token.startsWith(`${scope}/`), token).toBe(true)
    }
  })

  it('renders tokens only for the groups that have been opened', async () => {
    const wrapper = open(TOKEN_SCOPE.UNIT)
    const first = Object.values(TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON])
    expect(wrapper.findAll('[data-testid^="token-picker-token-"]')).toHaveLength(first.length)

    await openGroup(wrapper, 1)
    const second = Object.values(TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.EFFECT])
    expect(wrapper.findAll('[data-testid^="token-picker-token-"]')).toHaveLength(
      first.length + second.length,
    )
  })

  it('shows the artwork, deferred, and names it for the pointer', () => {
    const token = TOKENS[TOKEN_SCOPE.UNIT][TOKEN_CATEGORY.COMMON].DAMAGE_1
    const img = open(TOKEN_SCOPE.UNIT).get(`[data-testid="token-picker-token-${token}"] img`)

    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('alt')).toBe('Damage 1')
    expect(img.attributes('title')).toBe('Damage 1')
    expect(img.attributes('src')).toBeTruthy()
  })

  it('emits the token that was clicked', async () => {
    const token = TOKENS[TOKEN_SCOPE.FIELD][TOKEN_CATEGORY.SPELLS].FIREWALL
    const wrapper = open()
    await wrapper.get(`[data-testid="token-picker-token-${token}"]`).trigger('click')
    expect(wrapper.emitted('select')).toEqual([[token]])
  })

  it('closes on a click outside the panel, on the close button and on Escape', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="token-picker-backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.get('[data-testid="token-picker-close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('stays open when the click lands inside the panel', async () => {
    const wrapper = open()
    await wrapper.get('[data-testid="token-picker"]').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('opens again with the groups the user left open', async () => {
    const first = open(TOKEN_SCOPE.UNIT)
    await openGroup(first, 2)
    first.unmount()

    const bodies = open(TOKEN_SCOPE.UNIT).findAll('[data-testid="accordion-body"]')
    expect(bodies[0].element.style.display).not.toBe('none')
    expect(bodies[2].element.style.display).not.toBe('none')
    expect(bodies[1].element.style.display).toBe('none')
  })

  it('remembers the two scopes apart', async () => {
    const unitScope = open(TOKEN_SCOPE.UNIT)
    await openGroup(unitScope, 1)
    unitScope.unmount()

    // The field list has one group of its own; nothing the unit list did counts.
    const field = open(TOKEN_SCOPE.FIELD)
    const bodies = field.findAll('[data-testid="accordion-body"]')
    expect(bodies).toHaveLength(1)
    expect(bodies[0].element.style.display).not.toBe('none')
  })
})
