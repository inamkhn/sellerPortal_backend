import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGlobalChat() {
    console.log('🌱 Seeding global chat room...');

    try {
        // Check if global chat already exists
        const existingGlobalChat = await prisma.groupChat.findFirst();

        if (existingGlobalChat) {
            console.log('✅ Global chat room already exists:', existingGlobalChat.id);
            return existingGlobalChat;
        }

        // Create global chat room
        const globalChat = await prisma.groupChat.create({
            data: {
                name: 'Global Chat',
                description: 'Community chat for all users',
                lastMessageAt: new Date(),
            },
        });

        console.log('✅ Global chat room created:', globalChat.id);

        // Get all existing users
        const allUsers = await prisma.user.findMany({
            select: { id: true, email: true },
        });

        console.log(`📝 Adding ${allUsers.length} users to global chat...`);

        // Add all users as participants
        for (const user of allUsers) {
            await prisma.groupParticipant.create({
                data: {
                    groupChatId: globalChat.id,
                    userId: user.id,
                    joinedAt: new Date(),
                },
            });
        }

        console.log('✅ All users added to global chat!');

        // Create a welcome message from admin
        const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        if (adminUser) {
            const welcomeMessage = await prisma.groupMessage.create({
                data: {
                    groupChatId: globalChat.id,
                    senderId: adminUser.id,
                    content:
                        '🎉 Welcome to the Global Chat! This is where everyone can communicate together. Feel free to share updates, ask questions, and connect with the community.',
                    messageType: 'TEXT',
                    isPinned: true,
                    pinnedBy: adminUser.id,
                    pinnedAt: new Date(),
                },
            });

            console.log('✅ Welcome message created and pinned!');
        } else {
            console.log('⚠️  No admin user found, skipping welcome message');
        }

        console.log('🎉 Global chat seeding completed successfully!');
        return globalChat;
    } catch (error) {
        console.error('❌ Error seeding global chat:', error);
        throw error;
    }
}

seedGlobalChat()
    .catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
