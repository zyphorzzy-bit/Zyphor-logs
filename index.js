const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ChannelSelectMenuBuilder,
  ChannelType,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

// Objeto de emojis integrado
const e = {
  aceito: "<:aceito:1539124707222093915>",
  pendente: "<:pendente:1539124705167147059>",
  recusado: "<:recusado:1539124703992614912>",
  horario: "<:horrio:1534611997335883886>",
  id: "<:ID:1534611999085039786>",
  user: "<:user:1539125800907968603>",
  proibido: "<:Proibido:1534611991929290877>",
  protecao: "<:proteo:1534611994353602732>",
  warn: "<:warn:1539125781320433724>",
  alerta: "<:alerta:1534611993410015456>",
  arquivo: "<:arquivo:1539124693460713552>",
  aceitar: "<:aceitar:1539124696912756767>",
  recusar: "<:recusar:1539124698338566257>",
  linkexterno: "<:linkexterno:1539124690709385330>",
  config: "<:config:1534611990633250937>",
  ativado: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  loading: "<a:loanding:1534612861211377868>",
  seta: "<:seta:1539785898693234700>",
  pingbom: "<a:pingbom:1539786201551077386>",
  pingruim: "<a:pingruim:1539786202822217731>"
};

// IDs autorizados
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

// Função para formatar o tempo (muda segundos em horas/minutos)
function formatarTempo(ms) {
  const segundos = Math.floor((ms / 1000) % 60);
  const minutos = Math.floor((ms / (1000 * 60)) % 60);
  const horas = Math.floor(ms / (1000 * 60 * 60));

  let resultado = [];
  if (horas > 0) resultado.push(`${horas}h`);
  if (minutos > 0) resultado.push(`${minutos}m`);
  resultado.push(`${segundos}s`);

  return resultado.join(' ');
}

client.once('ready', async () => {
  console.log(`Bot online em ${client.user.tag}`);

  const streamSalva = await db.get('status_stream');
  if (streamSalva) {
    client.user.setActivity(streamSalva, {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/twitch'
    });
  }

  const commands = [
    {
      name: 'config',
      description: 'Abre o painel de configuração do bot'
    }
  ];

  await client.application.commands.set(commands);
});

// Comandos por Prefixo (.f e Fox.rank)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Comando .f
  if (message.content.startsWith('.f')) {
    if (!AUTORIZADOS.includes(message.author.id)) {
      return message.reply(`${e.proibido} Você não tem permissão para alterar o status da stream.`);
    }

    const novoTexto = message.content.slice(2).trim();

    if (!novoTexto) {
      return message.reply(`${e.alerta} **Uso correto:** \`.f <mensagem da stream>\``);
    }

    client.user.setActivity(novoTexto, {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/twitch'
    });

    await db.set('status_stream', novoTexto);

    return message.reply(`${e.aceito} **Stream atualizada para:** \`${novoTexto}\``);
  }

  // Comando Fox.rank
  if (message.content.toLowerCase() === 'fox.rank') {
    const msgRank = await message.channel.send(`${e.loading} Carregando ranking de call...`);
    
    // Atualiza imediatamente e ativa loop para atualização contínua
    await atualizarRankMsg(msgRank, message.guild);

    const interval = setInterval(async () => {
      try {
        await atualizarRankMsg(msgRank, message.guild);
      } catch (err) {
        clearInterval(interval);
      }
    }, 10000); // Atualiza o painel do rank a cada 10 segundos
  }
});

// Gerador do texto do Rank de Call
async function atualizarRankMsg(message, guild) {
  const allData = await db.all();
  const prefix = `voice_time_${guild.id}_`;
  
  let ranking = [];

  for (const entry of allData) {
    if (entry.id.startsWith(prefix)) {
      const userId = entry.id.replace(prefix, '');
      let tempoTotal = entry.value || 0;

      // Soma o tempo da sessão atual se o membro ainda estiver na call
      const joinTime = await db.get(`voice_join_${guild.id}_${userId}`);
      if (joinTime) {
        tempoTotal += (Date.now() - joinTime);
      }

      ranking.push({ userId, tempo: tempoTotal });
    }
  }

  ranking.sort((a, b) => b.tempo - a.tempo);
  const top10 = ranking.slice(0, 10);

  if (top10.length === 0) {
    return message.edit({
      content: `${e.horario} **RANKING DE CALL DA FOX** ${e.horario}\n\n${e.alerta} Nenhum registro de tempo em call encontrado ainda.`
    });
  }

  let texto = `${e.horario} **RANKING DE TEMPO EM CALL - ${guild.name.toUpperCase()}** ${e.horario}\n` +
              `${e.seta} *Atualizando em tempo real...*\n\n`;

  for (let i = 0; i < top10.length; i++) {
    const pos = i + 1;
    const user = await client.users.fetch(top10[i].userId).catch(() => null);
    const tag = user ? user.username : 'Usuário Desconhecido';
    const tempo = formatarTempo(top10[i].tempo);

    const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `**#${pos}**`;
    texto += `${medalha} \`${tag}\` ${e.seta} **${tempo}**\n`;
  }

  await message.edit({ content: texto });
}

// Interações do Painel /config
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isModalSubmit()) {
    if (!AUTORIZADOS.includes(interaction.user.id)) {
      return interaction.reply({
        content: `${e.proibido} **Acesso Negado!** Apenas os administradores autorizados podem usar este painel.`,
        ephemeral: true
      });
    }
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'config') {
      return enviarPainelPrincipal(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_edit_stream') {
      const novoTexto = interaction.fields.getTextInputValue('stream_text_input');

      client.user.setActivity(novoTexto, {
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/twitch'
      });

      await db.set('status_stream', novoTexto);
      await responderSucesso(interaction, `Transmissão alterada para: \`${novoTexto}\``);
    }
  }

  if (interaction.isStringSelectMenu()) {
    const valor = interaction.values[0];

    if (valor === 'menu_home') {
      return enviarPainelPrincipal(interaction, true);
    } 
    else if (valor === 'op_stream') {
      const modal = new ModalBuilder()
        .setCustomId('modal_edit_stream')
        .setTitle('Editar Transmissão (Stream)');

      const input = new TextInputBuilder()
        .setCustomId('stream_text_input')
        .setLabel('Texto da Transmissão')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Transmitindo no Youtube!')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
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
        content: `${e.user} **Módulo de Boas-Vindas**\n${e.seta} Selecione os canais de recebimento:`,
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
        content: `${e.arquivo} **Módulo de Logs de Mensagens**\n${e.seta} Selecione o canal de logs de mensagens:`,
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
        content: `${e.horario} **Módulo de Logs de Call**\n${e.seta} Selecione o canal de logs de voz:`,
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
        content: `${e.warn} **Módulo de Logs de Punições**\n${e.seta} Selecione o canal de logs de punição:`,
        components: [
          new ActionRowBuilder().addComponents(canalSelect),
          new ActionRowBuilder().addComponents(voltarBtn)
        ]
      });
    }
  }

  if (interaction.isChannelSelectMenu()) {
    const guildId = interaction.guildId;

    if (interaction.customId === 'select_canal_welcome') {
      await db.set(`welcome_channels_${guildId}`, interaction.values);
      await responderSucesso(interaction, 'Canais de boas-vindas salvos com sucesso!');
    } else if (interaction.customId === 'select_canal_logs_msg') {
      await db.set(`log_msg_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de mensagens salvo!');
    } else if (interaction.customId === 'select_canal_logs_call') {
      await db.set(`log_call_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de call salvo!');
    } else if (interaction.customId === 'select_canal_logs_punish') {
      await db.set(`log_punish_${guildId}`, interaction.values[0]);
      await responderSucesso(interaction, 'Canal de logs de punições salvo!');
    }
  }
});

async function enviarPainelPrincipal(interaction, isUpdate = false) {
  const guildId = interaction.guildId;

  const welcomeChannels = await db.get(`welcome_channels_${guildId}`);
  const logMsg = await db.get(`log_msg_${guildId}`);
  const logCall = await db.get(`log_call_${guildId}`);
  const logPunish = await db.get(`log_punish_${guildId}`);
  const streamAtual = await db.get('status_stream') || 'Nenhuma definida';

  const statusWelcome = welcomeChannels && welcomeChannels.length ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusMsg = logMsg ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusCall = logCall ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;
  const statusPunish = logPunish ? `${e.ativado} Ativado` : `${e.desativado} Desativado`;

  const menu = new StringSelectMenuBuilder()
    .setCustomId('menu_principal_config')
    .setPlaceholder('Selecione um módulo para gerenciar...')
    .addOptions([
      { label: 'Alterar Stream', description: 'Mudar o status de transmissão', value: 'op_stream', emoji: '1539124690709385330' },
      { label: 'Boas-Vindas', description: 'Configurar até 2 canais de entrada', value: 'op_welcome', emoji: '1539125800907968603' },
      { label: 'Logs de Mensagens', description: 'Apagadas e Editadas', value: 'op_logs_msg', emoji: '1539124693460713552' },
      { label: 'Logs de Voz (Call)', description: 'Entradas e saídas de voz', value: 'op_logs_call', emoji: '1534611997335883886' },
      { label: 'Logs de Punições', description: 'Banimentos e punições', value: 'op_logs_punish', emoji: '1539125781320433724' }
    ]);

  const textoPainel = `${e.config} **PAINEL DE CONFIGURAÇÃO GERAL**\n\n` +
                      `> ${e.linkexterno} **Stream Atual:** \`${streamAtual}\`\n` +
                      `> ${e.user} **Boas-Vindas:** ${statusWelcome}\n` +
                      `> ${e.arquivo} **Logs de Mensagens:** ${statusMsg}\n` +
                      `> ${e.horario} **Logs de Call:** ${statusCall}\n` +
                      `> ${e.warn} **Logs de Punições:** ${statusPunish}\n\n` +
                      `${e.seta} *Dica: Use \`Fox.rank\` no chat para abrir o contador em tempo real!*`;

  const row = new ActionRowBuilder().addComponents(menu);

  if (isUpdate) {
    await interaction.update({ content: textoPainel, components: [row] });
  } else {
    await interaction.reply({ content: textoPainel, components: [row], ephemeral: true });
  }
}

async function responderSucesso(interaction, mensagem) {
  const voltarMenu = new StringSelectMenuBuilder()
    .setCustomId('menu_principal_config')
    .setPlaceholder('Abrir Painel')
    .addOptions([{ label: 'Voltar ao Painel Principal', value: 'menu_home', emoji: '1539785898693234700' }]);

  await interaction.reply({
    content: `${e.aceito} **Sucesso!** ${mensagem}`,
    components: [new ActionRowBuilder().addComponents(voltarMenu)],
    ephemeral: true
  });
}

// SISTEMA DE CONTAGEM DE TEMPO DE VOICE E LOGS DE CALL
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const userId = newState.id || oldState.id;
  const member = newState.member || oldState.member;

  if (member.user.bot) return;

  // 1. Contabilização do tempo do Rank de Call
  // Entrada na call
  if (!oldState.channelId && newState.channelId) {
    await db.set(`voice_join_${guild.id}_${userId}`, Date.now());
  } 
  // Saída da call
  else if (oldState.channelId && !newState.channelId) {
    const joinTime = await db.get(`voice_join_${guild.id}_${userId}`);
    if (joinTime) {
      const tempoDecorrido = Date.now() - joinTime;
      await db.add(`voice_time_${guild.id}_${userId}`, tempoDecorrido);
      await db.delete(`voice_join_${guild.id}_${userId}`);
    }
  }

  // 2. Logs de Call
  const logId = await db.get(`log_call_${guild.id}`);
  if (!logId) return;

  const logChannel = guild.channels.cache.get(logId);
  if (!logChannel) return;

  if (!oldState.channelId && newState.channelId) {
    await logChannel.send({ content: `${e.aceito} ${member.user} **entrou no canal de voz:** <#${newState.channelId}>` });
  } else if (oldState.channelId && !newState.channelId) {
    await logChannel.send({ content: `${e.recusado} ${member.user} **saiu do canal de voz:** <#${oldState.channelId}>` });
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    await logChannel.send({ content: `${e.horario} ${member.user} **mudou de canal de voz:** <#${oldState.channelId}> ${e.seta} <#${newState.channelId}>` });
  }
});

// Eventos de Boas-Vindas
client.on('guildMemberAdd', async (member) => {
  const canais = await db.get(`welcome_channels_${member.guild.id}`);
  if (!canais || !canais.length) return;

  const tempoConta = Math.floor(member.user.createdTimestamp / 1000);
  const texto = `${e.user} Olá ${member}, seja bem-vindo(a) ao servidor!\n` +
                `${e.id} ID: \`${member.id}\`\n` +
                `${e.horario} Conta criada: <t:${tempoConta}:R>`;

  for (const canalId of canais) {
    const canal = member.guild.channels.cache.get(canalId);
    if (canal) await canal.send({ content: texto });
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
                `${e.seta} Conteúdo: \`\`\`${message.content || 'Apenas mídias/anexos'}\`\`\``;

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
