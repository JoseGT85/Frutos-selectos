import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase no configurado. Las órdenes no se persistirán en la nube.");
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const db = {
  // Guardar una orden
  async saveOrder(order) {
    if (!supabase) return { error: "Supabase not connected" };
    const { data, error } = await supabase
      .from('orders')
      .insert([order]);
    return { data, error };
  },

  // Obtener KB desde DB (opcional para Vercel)
  async getKB() {
    if (!supabase) return null;
    const { data } = await supabase.from('knowledge_base').select('*');
    return data;
  },

  // Registrar logs de seguridad
  async logSecurity(event) {
    if (!supabase) return;
    await supabase.from('security_logs').insert([event]);
  },

  // Subir imagen a Storage
  async uploadImage(file, fileName) {
    if (!supabase) return { error: "Supabase not connected" };
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) return { error };

    // Obtener URL pública
    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return { url: publicUrl.publicUrl, data };
  }
};
