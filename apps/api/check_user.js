const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ 
    where: { email: 'admin@example.com' }
  });
  
  if (!user) {
    console.log('❌ User not found in database!');
    console.log('Creating superadmin user...');
    
    const hash = await bcrypt.hash('jia.kaleem69', 10);
    const newUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: hash,
        role: 'SUPERADMIN',
        isActive: true
      }
    });
    console.log('✅ User created:', newUser.email);
  } else {
    console.log('✅ User exists:', user.email);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);
    
    // Test password
    const match = await bcrypt.compare('jia.kaleem69', user.passwordHash);
    console.log('Password matches:', match);
    
    if (!match) {
      console.log('❌ Password mismatch! Updating...');
      const hash = await bcrypt.hash('jia.kaleem69', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash }
      });
      console.log('✅ Password updated');
    }
  }
  
  await prisma.$disconnect();
}

main();
