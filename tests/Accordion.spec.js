import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Accordion from '../src/components/Accordion.vue'

const mountOne = (props = {}) =>
  mount(Accordion, { props: { title: 'Castle', ...props }, slots: { default: '<p>body</p>' } })

const body = (wrapper) => wrapper.get('[data-testid="accordion-body"]')
const isOpen = (wrapper) => body(wrapper).element.style.display !== 'none'

describe('Accordion', () => {
  it('is open by default', () => {
    const wrapper = mountOne()
    expect(isOpen(wrapper)).toBe(true)
    expect(wrapper.get('[data-testid="accordion-header"]').attributes('aria-expanded')).toBe('true')
  })

  it('shows its title', () => {
    expect(mountOne().get('[data-testid="accordion-header"]').text()).toContain('Castle')
  })

  it('toggles on header click', async () => {
    const wrapper = mountOne()
    await wrapper.get('[data-testid="accordion-header"]').trigger('click')
    expect(isOpen(wrapper)).toBe(false)
    expect(wrapper.get('[data-testid="accordion-header"]').attributes('aria-expanded')).toBe('false')

    await wrapper.get('[data-testid="accordion-header"]').trigger('click')
    expect(isOpen(wrapper)).toBe(true)
  })

  it('can start collapsed', () => {
    expect(isOpen(mountOne({ defaultOpen: false }))).toBe(false)
  })

  it('does not render its body until it is first opened', async () => {
    const wrapper = mountOne({ defaultOpen: false })
    expect(body(wrapper).text()).toBe('')

    await wrapper.get('[data-testid="accordion-header"]').trigger('click')
    expect(body(wrapper).text()).toBe('body')
  })

  it('keeps the body mounted once opened, so collapsing only hides it', async () => {
    const wrapper = mountOne({ defaultOpen: false })
    const header = wrapper.get('[data-testid="accordion-header"]')

    await header.trigger('click')
    await header.trigger('click')

    expect(isOpen(wrapper)).toBe(false)
    expect(body(wrapper).text()).toBe('body')
  })

  it('keeps its own state, independent of siblings', async () => {
    const wrapper = mount(
      {
        components: { Accordion },
        template: `
          <div>
            <Accordion title="A"><p>a</p></Accordion>
            <Accordion title="B"><p>b</p></Accordion>
          </div>`,
      },
      { attachTo: document.body },
    )
    const headers = wrapper.findAll('[data-testid="accordion-header"]')
    const bodies = wrapper.findAll('[data-testid="accordion-body"]')

    await headers[0].trigger('click')
    expect(bodies[0].element.style.display).toBe('none')
    expect(bodies[1].element.style.display).not.toBe('none')
  })
})
