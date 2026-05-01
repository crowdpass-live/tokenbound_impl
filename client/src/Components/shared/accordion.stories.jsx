import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
import { expect, userEvent, within } from '@storybook/test';

export default {
  title: 'Shared/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: (args) => (
    <Accordion {...args} type="single" collapsible className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4">Is it accessible?</AccordionTrigger>
        <AccordionContent className="px-4 text-gray-600">
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="px-4">Is it unstyled?</AccordionTrigger>
        <AccordionContent className="px-4 text-gray-600">
          Yes. It&apos;s unstyled by default, giving you freedom over the look and feel.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="px-4">Is it animated?</AccordionTrigger>
        <AccordionContent className="px-4 text-gray-600">
          Yes. It&apos;s animated by default, but you can disable it if you prefer.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByText('Is it accessible?');
    await userEvent.click(trigger);
    const content = canvas.getByText(/It adheres to the WAI-ARIA design pattern/);
    await expect(content).toBeVisible();
  },
};

export const Multiple = {
  render: (args) => (
    <Accordion {...args} type="multiple" className="w-[450px]">
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4">Can I open multiple items?</AccordionTrigger>
        <AccordionContent className="px-4 text-gray-600">
          Yes, by setting the type to &quot;multiple&quot;.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="px-4">What about default values?</AccordionTrigger>
        <AccordionContent className="px-4 text-gray-600">
          You can provide a defaultValue prop.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
