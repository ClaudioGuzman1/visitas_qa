create table visitas_soporte (
  id text primary key, -- Se usa el hash generado por la app 'V-timestamp'
  ticket text not null,
  fecha_atencion date,
  cliente text,
  datos_completos_json jsonb, -- Almacena toda la estructura incluyendo imágenes Base64
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);