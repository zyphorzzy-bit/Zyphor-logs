const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits 
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const e = require('./emojis.js');

// IDs autorizados a usar o painel de configuração
const AUTORIZADOS = ['1533306874513068093', '1465045589107413174'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// Evento quando o bot liga
client.once('ready', async () => {
  console.log(`Bot online em ${client.user.tag}`);

  const commands = [
    {
      name: 'config',
      description: 'Abre o painel de configuração avançada do bot'
    }
  ];

  await client.application.commands.set(commands);
});

// Interações (Comandos e Menus)
client.on('interactionCreate', async (interaction) => {
  // Verifica se quem está tentando mexer nas configurações é autorizado
  if (interaction.isChatInputCommand() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
    if (!AUTORIZADOS.includes(interaction.user.id)) {
      return interaction.reply({
        content: `${e.proibido} **Acesso Negado!** Apenas os administradores autorizados podem configurar este bot.`,
        ephemeral: true
      });
    }
  }

  // Comando /config
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'config') {
      returnenviarPainelPrincipal(interaction);
    }
  }

  // Menus de Seleção Principal e Submenus
  if (interaction.isStringSelectMenu()) {
    const valor = interaction.values[0];

    if (valor === 'menu_home') {
      returnenviarPainelPrincipal(interaction, true);
    } 
    else if (valor === 'op_welcome') {
      const canalSelect = new ChannelSelectMenuBuilder()
        .setCustomId('select_canal_welcome')
        .setPlaceholder('Selecione até 2 canais de boas-vindas')
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(2);

      const voltarBtn = new StringSelectMenuBuilder()
        .setCustomId('menu_principal_config')
        .setPlaceholder('Voltar ao Menu Principal')
        .addOptions([{ label: 'Voltar ao Início', value: 'menu_home', emoji: '1539785898693234700' }]);

      await interaction.update({
        content: `${e.user} **Módulo de Boas-Vindas**\n${e.seta} Selecione abaixo os canais onde as mensagens serão enviadas (Sem embed, apenas texto e foto opcional):`,
        components: [
          new ActionRowBuilder().addComponents(canalSelect),
          new ActionRowBuilder().addComponents(voltarBtn)
        ]
      });
    } 
    else if (valor === 'op_logs_msg') {
      const canalSelect = new ChannelSelectMenuBuilder()
        .setCustomId('select_canal_logs_msg')
        .setPlaceholder('Selecione o canal de logs de mensagens')
        .setChannelTypes(ChannelType.GuildText);

      const voltarBtn = new StringSelectMenuBuilder()
        .setCustomId('menu_principal_config')
        .setPlaceholder('Voltar ao Menu Principal')
        .addOptions([{ label: 'Voltar ao Início', value: 'menu_home', emoji: '1539785898693234700' }]);

      await interaction.update({
        content: `${e.arquivo} **Módulo de Logs de Mensagens**\n${e.seta} Selecione o canal onde deseja registrar mensagens apagadas e editadas:`,
        components: [
          new ActionRowBuilder().addComponents(canalSelect),
          new ActionRowBuilder().addComponents(voltarBtn)
        ]
      });
    } 
    else if (valor === 'op_logs_call') {
      const canalSelect = new ChannelSelectMenuBuilder()
        .setCustomId('select_canal_logs_call')
        .setPlaceholder('Selecione o canal de logs de call')
        .setChannelTypes(ChannelType.GuildText);

      const voltarBtn = new StringSelectMenuBuilder()
        .setCustomId('menu_principal_config')
        .setPlaceholder('Voltar ao Menu Principal')
        .addOptions([{ label: 'Voltar ao Início', value: 'menu_home', emoji: '1539785898693234700' }]);

      await interaction.update({
        content: `${e.horario} **Módulo de Logs de Call**\n${e.seta} Selecione o canal onde deseja registrar entradas, saídas e trocas em canais de voz:`,
        components: [
          new ActionRowBuilder().addComponents(canalSelect),
          new ActionRowBuilder().addComponents(voltarBtn)
        ]
      });
    } 
    else if (valor === 'op_logs_punish') {
      const canalSelect = new ChannelSelectMenuBuilder()
        .setCustomId('select_canal_logs_punish')
        .setPlaceholder('Selecione o canal de logs de punições')
        .setChannelTypes(ChannelType.GuildText);

      const voltarBtn = new StringSelectMenuBuilder()
        .setCustomId('menu_principal_config')
        .setPlaceholder('Voltar ao Menu Principal')
        .addOptions([{ label: 'Voltar ao Início', value: 'menu_home', emoji: '1539785898693234700' }]);

      await interaction.update({
        content: `${e.warn} **Módulo de Logs de Punições**\n${e.seta} Selecione o canal onde deseja registrar banimentos e punições:`,
        components: [
          new ActionRowBuilder().addComponents(canalSelect),
          new ActionRowBuilder().addComponents(voltarBtn)
        ]
      });
    }
  }

  // Salvando as seleções de canais feitas nos menus
  if (interaction.isChannelSelectMenu()) {
    const guildId = interaction.guildId;

    if (interaction.customId === 'select_canal_welcome') {
      await db.set(`welcome_channels_${guildId}`, interaction.values);
      await responderSucesso(interaction, 'Canais de boas-vindas configurados com sucesso!');
    } else if (interaction.customId === 'select_canal_logs_msg') {
      await db.set(`log_msg_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de mensagens configurado com sucesso!');
    } else if (interaction.customId === 'select_canal_logs_call') {
      await db.set(`log_call_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de call configurado com sucesso!');
    } else if (interaction.customId === 'select_canal_logs_punish') {
      await db.set(`log_punish_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de punições configurado com sucesso!');
    }
  }
});

// Função auxiliar para desenhar o painel principal com o status atual de cada módulo
async functionenviarPainelPrincipal(interaction, isUpdate = false) {
  const guildId = interaction.guildId;

  // Busca o status atual salvo no banco de dados para exibir no painel
  const welcomeChannels = await db.get(`welcome_channels_${guildId}`);
  const logMsg = await db.get(`log_msg_${guildId}`);
  const logCall = await db.get(`log_call_${guildId}`);
  const logPunish = await db.get(`log_punish_${guildId}`);

  const statusWelcome = welcomeChannels && welcomeChannels.length ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusMsg = logMsg ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusCall = logCall ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusPunish = logPunish ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;

  const menu = new StringSelectMenuBuilder()
    .setCustomId('menu_principal_config')
    .setPlaceholder('Clique aqui para gerenciar os sistemas...')
    .addOptions([
      { label: 'Boas-Vindas', description: 'Configurar até 2 canais de entrada', value: 'op_welcome', emoji: '1539125800907968603' },
      { label: 'Logs de Mensagens', description: 'Apagadas e Editadas', value: 'op_logs_msg', emoji: '1539124693460713552' },
      { label: 'Logs de Voz (Call)', description: 'Entradas e saídas de canais de voz', value: 'op_logs_call', emoji: '1534611997335883886' },
      { label: 'Logs de Punições', description: 'Banimentos e punições gerais', value: 'op_logs_punish', emoji: '1539125781320433724' }
    ]);

  const textoPainel = `${e.config} **PAINEL DE CONFIGURAÇÃO GERAL**\n` +
                      `${e.seta} Gerencie os sistemas do seu servidor de forma segura e rápida.\n\n` +
                      `> ${e.user} **Boas-Vindas:** ${statusWelcome}\n` +
                      `> ${e.arquivo} **Logs de Mensagens:** ${statusMsg}\n` +
                      `> ${e.horario} **Logs de Call:** ${statusCall}\n` +
                      `> ${e.warn} **Logs de Punições:** ${statusPunish}`;

  const row = new ActionRowBuilder().addComponents(menu);

  if (isUpdate) {
    await interaction.update({ content: textoPainel, components: [row] });
  } else {
    await interaction.reply({ content: textoPainel, components: [row], ephemeral: true });
  }
}

// Função auxiliar para confirmar salvamento e voltar ao painel
async function responderSucesso(interaction, mensagem) {
  const voltarMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_principal_config')
    .setPlaceholder('Abrir Painel Novamente')
    .addOptions([{ label: 'Voltar ao Painel Principal', value: 'menu_home', emoji: '1539785898693234700' }]);

  await interaction.update({
    content: `${e.aceito} **Sucesso!** ${mensagem}`,
    components: [new ActionRowBuilder().addComponents(voltarMenu)]
  });
}

// --- EVENTOS DOS SISTEMAS EM FUNCIONAMENTO ---

// Boas-Vindas (Sem Embed, apenas texto puro com suporte a anexo opcional)
client.on('guildMemberAdd', async (member) => {
  const canais = await db.get(`welcome_channels_${member.guild.id}`);
  if (!canais || !canais.length) return;

  const tempoConta = Math.floor(member.user.createdTimestamp / 1000);
  const texto = `${e.user} Olá ${member}, seja bem-vindo(a) ao servidor!\n` +
                `${e.id} ID: \`${member.id}\`\n` +
                `${e.horario} Conta criada: <t:${tempoConta}:R>`;

  for (const canalId of canais) {
    const canal = member.guild.channels.cache.get(canalId);
    if (canal) {
      // Envio sem embed (caso queira adicionar foto depois, basta colocar a URL no array files)
      await canal.send({ content: texto });
    }
  }
});

// Logs de Mensagem Apagada
client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  const logId = await db.get(`log_msg_${message.guild.id}`);
  if (!logId) return;

  const logChannel = message.guild.channels.cache.get(logId);
  if (!logChannel) return;

  const texto = `${e.alerta} **Mensagem Apagada**\n` +
                `${e.user} Autor: ${message.author}\n` +
                `${e.arquivo} Canal: ${message.channel}\n` +
                `${e.seta} Conteúdo: \`\`\`${message.content || 'Apenas mídias ou anexos'}\`\`\``;

  await logChannel.send({ content: texto });
});

// Logs de Mensagem Editada
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  const logId = await db.get(`log_msg_${oldMessage.guild.id}`);
  if (!logId) return;

  const logChannel = oldMessage.guild.channels.cache.get(logId);
  if (!logChannel) return;

  const texto = `${e.config} **Mensagem Editada**\n` +
                `${e.user} Autor: ${oldMessage.author}\n` +
                `${e.arquivo} Canal: ${oldMessage.channel}\n` +
                `${e.recusado} Antes: \`${oldMessage.content}\`\n` +
                `${e.aceito} Depois: \`${newMessage.content}\``;

  await logChannel.send({ content: texto });
});

// Logs de Call (Voz)
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const logId = await db.get(`log_call_${guild.id}`);
  if (!logId) return;

  const logChannel = guild.channels.cache.get(logId);
  if (!logChannel) return;

  const member = newState.member || oldState.member;

  if (!oldState.channelId && newState.channelId) {
    await logChannel.send({ content: `${e.aceito} ${member.user} **entrou no canal de voz:** <#${newState.channelId}>` });
  } else if (oldState.channelId && !newState.channelId) {
    await logChannel.send({ content: `${e.recusado} ${member.user} **saiu do canal de voz:** <#${oldState.channelId}>` });
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    await logChannel.send({ content: `${e.horario} ${member.user} **mudou de canal de voz:** <#${oldState.channelId}> ${e.seta} <#${newState.channelId}>` });
  }
});

// Logs de Punição (Banimento)
client.on('guildBanAdd', async (ban) => {
  const logId = await db.get(`log_punish_${ban.guild.id}`);
  if (!logId) return;

  const logChannel = ban.guild.channels.cache.get(logId);
  if (!logChannel) return;

  await logChannel.send({
    content: `${e.proibido} **Membro Banido**\n` +
             `${e.user} Usuário: ${ban.user.tag}\n` +
             `${e.id} ID: \`${ban.user.id}\``
  });
});

client.login(process.env.TOKEN);
