/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Categorías que coinciden con los slugs del frontend (catData)
const categories = [
  { name: 'Ramos de Mano', slug: 'ramos', description: 'Bouquets artesanales frescos', image: 'https://floresdebarro.cl/cdn/shop/products/RMNFCA-1-floresdebarro-francisca.jpg?v=1656697092&width=533' },
  { name: 'Floreros', slug: 'floreros', description: 'Elegantes composiciones en florero', image: 'https://www.kukyflor.com/blog/wp-content/uploads/2022/12/Floreros-de-vidrio-como-elegir-el-mejor-diseno-para-tus-flores.jpg' },
  { name: 'Orquídeas', slug: 'orquideas', description: 'La elegancia tropical', image: 'https://m.media-amazon.com/images/I/71qbmWn6VbL._AC_UF894,1000_QL80_.jpg' },
  { name: 'Estacional', slug: 'estacional', description: 'Lo mejor de la temporada', image: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=500&q=80' },
];

// Productos — sku = id del frontend (p1..p12). cat = slug principal.
const products = [
  { sku: 'p1',  name: 'Bouquet Azul y Blanco', price: 380, oldPrice: 450, tag: 'NUEVO',     cat: 'ramos',      rating: 4.9, reviews: 248, featured: true,  discount: true,  stock: 25, img: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600&q=80' },
  { sku: 'p2',  name: 'Ramos Rosas Reales',    price: 520, oldPrice: 650, tag: '−20%',      cat: 'ramos',      rating: 4.8, reviews: 192, featured: true,  discount: true,  stock: 18, img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80' },
  { sku: 'p3',  name: 'Canasta con Flores',    price: 620, oldPrice: null, tag: 'TOP',       cat: 'ramos',      rating: 5.0, reviews: 89,  featured: true,  discount: false, stock: 12, img: 'https://www.yaakunflores.com/uploads/arreglos/canasta-de-100-rosas-tonos-rosas-con-guia.jpg' },
  { sku: 'p4',  name: 'Peonías Silvestres',    price: 640, oldPrice: null, tag: 'LIMITADO',  cat: 'estacional', rating: 4.9, reviews: 156, featured: true,  discount: false, stock: 8,  img: 'https://cdn0.ecologiaverde.com/es/posts/3/6/1/peonias_como_cuidarlas_y_su_significado_2163_600.jpg' },
  { sku: 'p5',  name: 'Florero de Cristal',    price: 450, oldPrice: null, tag: 'NUEVO',     cat: 'floreros',   rating: 4.7, reviews: 64,  featured: false, discount: false, stock: 20, img: 'https://m.media-amazon.com/images/I/61gYBQ1YFhL._AC_UF894,1000_QL80_.jpg' },
  { sku: 'p6',  name: 'Orquídea Blanca',       price: 380, oldPrice: null, tag: 'TOP',       cat: 'orquideas',  rating: 4.8, reviews: 201, featured: true,  discount: false, stock: 30, img: 'https://verbenaflores.com/cdn/shop/files/verbena-orquidea-blanca-maceta-blanca.jpg?v=1770441565&width=1445' },
  { sku: 'p7',  name: 'Orquídea Phalaenopsis', price: 490, oldPrice: null, tag: 'PREMIUM',   cat: 'orquideas',  rating: 4.9, reviews: 118, featured: false, discount: false, stock: 15, img: 'https://images.unsplash.com/photo-1585631904378-1a1cdb91ae01?w=600&q=80' },
  { sku: 'p8',  name: 'Ramo Estacional Otoño', price: 340, oldPrice: null, tag: 'TEMPORADA', cat: 'estacional', rating: 4.6, reviews: 73,  featured: false, discount: false, stock: 22, img: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=600&q=80' },
  { sku: 'p9',  name: 'Florero Arreglo Mixto', price: 520, oldPrice: null, tag: 'POPULAR',   cat: 'floreros',   rating: 4.7, reviews: 95,  featured: false, discount: false, stock: 14, img: 'https://images.unsplash.com/photo-1455582916367-25f75bfc6710?w=600&q=80' },
  { sku: 'p10', name: 'Bouquet de Lavanda',    price: 290, oldPrice: null, tag: 'NUEVO',     cat: 'estacional', rating: 4.8, reviews: 143, featured: false, discount: false, stock: 26, img: 'https://images.unsplash.com/photo-1471086569966-db3eebc25a59?w=600&q=80' },
  { sku: 'p11', name: 'Girasoles del Campo',   price: 260, oldPrice: null, tag: 'FAVORITO',  cat: 'estacional', rating: 4.9, reviews: 312, featured: true,  discount: false, stock: 40, img: 'https://images.unsplash.com/photo-1471197347700-6e6c284ab2c3?w=600&q=80' },
  { sku: 'p12', name: 'Orquídea Dendrobium',   price: 430, oldPrice: null, tag: 'EXCLUSIVO', cat: 'orquideas',  rating: 4.8, reviews: 87,  featured: false, discount: false, stock: 10, img: 'https://images.unsplash.com/photo-1600411832435-53e5f6a9ed5e?w=600&q=80' },
];

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina acentos/diacríticos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function main() {
  console.log('🌱  Iniciando seed de Fleur...');

  // ---- Limpieza (orden por dependencias) ----
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.user.deleteMany();

  // ---- Usuarios ----
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const clientePass = await bcrypt.hash('Cliente123!', 10);

  const admin = await prisma.user.create({
    data: { name: 'Administrador Fleur', email: 'admin@fleur.mx', password: adminPass, role: 'admin' },
  });
  const cliente = await prisma.user.create({
    data: { name: 'Valentina Cliente', email: 'cliente@fleur.mx', password: clientePass, role: 'cliente' },
  });
  console.log(`👤  Usuarios: ${admin.email} (admin) / ${cliente.email} (cliente)`);

  // ---- Categorías ----
  const catMap = {};
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    catMap[c.slug] = created.id;
  }
  console.log(`📂  ${categories.length} categorías creadas`);

  // ---- Productos ----
  for (const p of products) {
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        slug: slugify(p.name),
        description: `${p.name} — arreglo floral artesanal de Fleur, elaborado con flores frescas seleccionadas.`,
        price: p.price,
        oldPrice: p.oldPrice,
        image: p.img,
        tag: p.tag,
        stock: p.stock,
        rating: p.rating,
        reviews: p.reviews,
        featured: p.featured,
        discount: p.discount,
        categoryId: catMap[p.cat],
      },
    });
  }
  console.log(`🌸  ${products.length} productos creados`);

  // ---- Newsletter de ejemplo ----
  await prisma.newsletterSubscriber.create({ data: { email: 'suscriptora@example.com' } });

  console.log('✅  Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌  Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
