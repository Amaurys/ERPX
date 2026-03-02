import { useEffect, useMemo, useState } from 'react';

const ERP_MODULES = [
  {
    key: 'caja',
    title: 'Caja',
    fields: ['concepto', 'tipo', 'monto'],
    seed: [
      { concepto: 'Venta mostrador', tipo: 'Ingreso', monto: 1250 },
      { concepto: 'Pago servicios', tipo: 'Egreso', monto: 430 },
    ],
  },
  {
    key: 'inventarios',
    title: 'Inventarios',
    fields: ['producto', 'categoria', 'stock'],
    seed: [
      { producto: 'Laptop i5', categoria: 'Tecnología', stock: 8 },
      { producto: 'Mouse inalámbrico', categoria: 'Accesorios', stock: 34 },
    ],
  },
  {
    key: 'reportes',
    title: 'Reportes',
    fields: ['nombre', 'periodo', 'estado'],
    seed: [
      { nombre: 'Ventas mensual', periodo: '2026-02', estado: 'Generado' },
      { nombre: 'Balance trimestral', periodo: 'Q1', estado: 'Pendiente' },
    ],
  },
  {
    key: 'deudas',
    title: 'Deudas',
    fields: ['acreedor', 'monto', 'vencimiento'],
    seed: [
      { acreedor: 'Proveedor ABC', monto: 2000, vencimiento: '2026-03-15' },
      { acreedor: 'Banco XYZ', monto: 15000, vencimiento: '2026-09-01' },
    ],
  },
  {
    key: 'nominas',
    title: 'Nóminas',
    fields: ['empleado', 'cargo', 'salario'],
    seed: [
      { empleado: 'Laura Gómez', cargo: 'Administración', salario: 1200 },
      { empleado: 'Carlos Ruiz', cargo: 'Ventas', salario: 950 },
    ],
  },
  {
    key: 'compras',
    title: 'Compras',
    fields: ['proveedor', 'documento', 'total'],
    seed: [
      { proveedor: 'Importadora Sol', documento: 'FAC-423', total: 780 },
      { proveedor: 'Papelera SA', documento: 'FAC-901', total: 120 },
    ],
  },
];

const CURRENCY_MODULES = new Set(['caja', 'deudas', 'nominas', 'compras']);

const initializeData = () => {
  const stored = localStorage.getItem('erpx-data');
  if (stored) {
    return JSON.parse(stored);
  }

  return ERP_MODULES.reduce((acc, module) => {
    acc[module.key] = module.seed.map((item, index) => ({ id: crypto.randomUUID(), ...item, order: index }));
    return acc;
  }, {});
};

const prettyField = (field) => field.charAt(0).toUpperCase() + field.slice(1);

function App() {
  const [activeModule, setActiveModule] = useState(ERP_MODULES[0].key);
  const [data, setData] = useState(initializeData);

  useEffect(() => {
    localStorage.setItem('erpx-data', JSON.stringify(data));
  }, [data]);

  const moduleConfig = ERP_MODULES.find((module) => module.key === activeModule);

  const totals = useMemo(() => {
    const caja = data.caja ?? [];
    const deudas = data.deudas ?? [];
    const nominas = data.nominas ?? [];
    const inventarios = data.inventarios ?? [];

    const ingresos = caja
      .filter((item) => String(item.tipo).toLowerCase() === 'ingreso')
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    const egresos = caja
      .filter((item) => String(item.tipo).toLowerCase() !== 'ingreso')
      .reduce((acc, item) => acc + Number(item.monto || 0), 0);

    return {
      balanceCaja: ingresos - egresos,
      deudaTotal: deudas.reduce((acc, item) => acc + Number(item.monto || 0), 0),
      nominaTotal: nominas.reduce((acc, item) => acc + Number(item.salario || 0), 0),
      stockTotal: inventarios.reduce((acc, item) => acc + Number(item.stock || 0), 0),
    };
  }, [data]);

  const handleCreate = (moduleKey, values) => {
    setData((previous) => ({
      ...previous,
      [moduleKey]: [{ id: crypto.randomUUID(), ...values }, ...(previous[moduleKey] ?? [])],
    }));
  };

  const handleDelete = (moduleKey, id) => {
    setData((previous) => ({
      ...previous,
      [moduleKey]: (previous[moduleKey] ?? []).filter((record) => record.id !== id),
    }));
  };

  return (
    <div className="app-container">
      <header>
        <h1>ERPX</h1>
        <p>ERP web en React: caja, inventarios, reportes, deudas, nóminas y más.</p>
      </header>

      <section className="kpi-grid">
        <KpiCard label="Balance de caja" value={totals.balanceCaja} money />
        <KpiCard label="Deuda total" value={totals.deudaTotal} money />
        <KpiCard label="Nómina mensual" value={totals.nominaTotal} money />
        <KpiCard label="Stock total" value={totals.stockTotal} />
      </section>

      <nav className="module-tabs">
        {ERP_MODULES.map((module) => (
          <button
            key={module.key}
            className={activeModule === module.key ? 'active' : ''}
            onClick={() => setActiveModule(module.key)}
          >
            {module.title}
          </button>
        ))}
      </nav>

      <main className="panel">
        <h2>{moduleConfig.title}</h2>
        <ModuleForm module={moduleConfig} onCreate={handleCreate} />
        <ModuleTable
          module={moduleConfig}
          records={data[moduleConfig.key] ?? []}
          onDelete={handleDelete}
          money={CURRENCY_MODULES.has(moduleConfig.key)}
        />
      </main>
    </div>
  );
}

function KpiCard({ label, value, money = false }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>
        {money
          ? new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value)
          : new Intl.NumberFormat('es-EC').format(value)}
      </strong>
    </article>
  );
}

function ModuleForm({ module, onCreate }) {
  const initialForm = module.fields.reduce((acc, field) => {
    acc[field] = '';
    return acc;
  }, {});

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    setFormData(initialForm);
  }, [module.key]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate(module.key, formData);
    setFormData(initialForm);
  };

  return (
    <form className="module-form" onSubmit={handleSubmit}>
      {module.fields.map((field) => (
        <label key={field}>
          {prettyField(field)}
          <input
            value={formData[field]}
            onChange={(event) => setFormData((previous) => ({ ...previous, [field]: event.target.value }))}
            required
          />
        </label>
      ))}
      <button type="submit">Agregar</button>
    </form>
  );
}

function ModuleTable({ module, records, onDelete, money = false }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {module.fields.map((field) => (
              <th key={field}>{prettyField(field)}</th>
            ))}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              {module.fields.map((field) => (
                <td key={field}>
                  {money && ['monto', 'salario', 'total'].includes(field)
                    ? new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(record[field]))
                    : record[field]}
                </td>
              ))}
              <td>
                <button onClick={() => onDelete(module.key, record.id)} className="danger">
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
