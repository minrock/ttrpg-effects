import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ServiceDialog } from "../../../web/dialogs";

function DialogExample({ title }: { readonly title: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("Sin cambios");
  return <><button type="button" data-dialog-return-focus onClick={() => setOpen(true)}>Abrir confirmación</button>{open && <ServiceDialog title={title} onCancel={() => { setOpen(false); setResult("Cancelado"); }}><p>El borrador sintético permanece disponible hasta confirmar la acción.</p><footer><button type="button" onClick={() => { setOpen(false); setResult("Cancelado"); }}>Cancelar</button><button type="button" onClick={() => { setOpen(false); setResult("Descartado"); }}>Descartar</button></footer></ServiceDialog>}<button type="button" onClick={() => { setOpen(false); setResult("Reiniciado"); }}>Reiniciar</button><p role="status">{result}</p></>;
}

const meta = {
  title: "Composiciones/ServiceDialog",
  component: ServiceDialog,
  tags: ["autodocs"],
  args: { title: "Diálogo", onCancel: () => undefined, children: <p>Contenido del diálogo.</p> },
  argTypes: { onCancel: { table: { disable: true } }, children: { table: { disable: true } } },
  parameters: { uiContext: "service", docs: { description: { component: "Diálogo modal del servicio. Fuente: `web/dialogs.tsx`; consumidores: confirmaciones y recuperación. El ejemplo usa datos locales, cierra con Escape y restaura el foco al disparador." } } }
} satisfies Meta<typeof ServiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Confirmacion: Story = { render: args => <DialogExample title={args.title} /> };
